import * as apigateway from 'aws-cdk-lib/aws-apigateway';
import * as cdk from 'aws-cdk-lib';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as ecs from 'aws-cdk-lib/aws-ecs';
import * as elbv2 from 'aws-cdk-lib/aws-elasticloadbalancingv2';
import { Construct } from 'constructs';

// TODO: Change this to your IP address but leave `/32` at the end
// Find your IP at https://checkip.amazonaws.com)
// const MY_IP_ADDRESS = '0.0.0.0/32';

/*
Best option is to find the albSecurityGroup in AWS Console
(securityGroupId outputted in this script) and manually add a
security rule to open up this ALB to traffic from any IPv4. 

Alternatively, grab API Gateway IPs for your region from:
https://ip-ranges.amazonaws.com/ip-ranges.json
Cmd + F for your region and copy-paste all API Gateway IPs.
*/


export class EcsFargateStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // Create VPC
    const vpc = new ec2.Vpc(this, 'ServerlessApmDemoVpc', {
      maxAzs: 2,
      natGateways: 1,
      vpcName: 'serverless-apm-demo-vpc',
    });

    // Create ECS Cluster
    const cluster = new ecs.Cluster(this, 'ExpressAppCluster', {
      vpc,
      clusterName: 'nev-express-app-cluster',
    });

    // Create Task Definition
    const taskDefinition = new ecs.FargateTaskDefinition(this, 'ExpressAppTask', {
      memoryLimitMiB: 512,
      cpu: 256,
    });

    // Add service container to task definition.
    const serviceContainer = taskDefinition.addContainer('ExpressAppContainer', {
      image: ecs.ContainerImage.fromAsset('../app', {
        buildArgs: {
            PLATFORM: 'linux/amd64'
        },
        platform: cdk.aws_ecr_assets.Platform.LINUX_AMD64,
      }),
      environment: {
        // Set environment variables on service.
        NODE_ENV: 'production',
        DD_TRACE_DEBUG: 'true',
        DD_TRACE_INFERRED_PROXY_SERVICES_ENABLED: 'false'
      },
      logging: ecs.LogDrivers.awsLogs({ streamPrefix: 'Nev-ExpressApp' }),
      portMappings: [
        {
          containerPort: 3000,
          hostPort: 3000,
          protocol: ecs.Protocol.TCP
        }
      ]
    });

    // Add Datadog agent container to task definition.
    const ddApiKey: string = process.env.DD_API_KEY || '';
    const datadogAgentContainer = taskDefinition.addContainer('datadog-agent', {
      image: ecs.ContainerImage.fromRegistry('public.ecr.aws/datadog/agent:latest'),
      environment: {
        DD_API_KEY: ddApiKey,
        ECS_FARGATE: 'true',
        DD_LOG_LEVEL: 'TRACE'
      },
      logging: new ecs.AwsLogDriver({
        streamPrefix: 'Container2',
      }),
      memoryLimitMiB: 512,
      cpu: 256,
      portMappings: [
        {
            containerPort: 8126,
            hostPort: 8126,
            protocol: ecs.Protocol.TCP
        }
    ]
    });

    // Create Security Group for ALB
    const albSecurityGroup = new ec2.SecurityGroup(this, 'ALBSecurityGroup', {
      vpc,
      allowAllOutbound: true,
      description: 'Security group for ALB',
    });

    // Allow inbound HTTP (port 80) traffic to the ALB
    // Only allow traffic from my IP address because the AWS sandbox removes Security Group Rules that are too public.
    // albSecurityGroup.addIngressRule(ec2.Peer.ipv4(MY_IP_ADDRESS), ec2.Port.tcp(80), 'Allow HTTP traffic');

    // Create Application Load Balancer (ALB)
    const loadBalancer = new elbv2.ApplicationLoadBalancer(this, 'ExpressAppALB', {
      vpc,
      internetFacing: true,
      securityGroup: albSecurityGroup, // Attach the ALB security group
    });

    // Create a Listener on the ALB
    const listener = loadBalancer.addListener('AlbListener', {
      port: 80, // HTTP Listener
      open: true,
    });

    // Create Security Group for Fargate Service
    const serviceSecurityGroup = new ec2.SecurityGroup(this, 'ExpressAppSecurityGroup', {
        vpc,
        allowAllOutbound: true,
        description: 'Express App Security Group',
    }); 
    
    serviceSecurityGroup.addIngressRule(ec2.Peer.anyIpv4(), ec2.Port.tcp(3000), 'Allow Express App traffic');

    // Create Fargate Service
    const service = new ecs.FargateService(this, 'ExpressAppService', {
      cluster,
      taskDefinition,
      desiredCount: 2,
      assignPublicIp: true,
      securityGroups: [serviceSecurityGroup],
    });

    // Attach Fargate Service to the ALB Target Group
    listener.addTargets('FargateTargetGroup', {
      port: 3000, // Forward requests to container
      protocol: elbv2.ApplicationProtocol.HTTP,
      targets: [service],
      healthCheck: {
        path: '/health', // Change this if your health check route is different
        interval: cdk.Duration.seconds(30),
      },
    });

    // Create API Gateway
    const api = new apigateway.RestApi(this, 'ExpressAppAPIGateway', {
      restApiName: 'ExpressAppAPI',
      description: 'API Gateway for forwarding requests to ALB',
      deployOptions: { stageName: 'prod' },
    });

    const integration = new apigateway.Integration({
      type: apigateway.IntegrationType.HTTP_PROXY,
      integrationHttpMethod: 'ANY',
      options: {
        connectionType: apigateway.ConnectionType.INTERNET,
        requestParameters: {
          "integration.request.header.x-dd-proxy": "'aws-apigateway'",
          "integration.request.header.x-dd-proxy-request-time-ms": "context.requestTimeEpoch",
          "integration.request.header.x-dd-proxy-domain-name": "context.domainName",
          "integration.request.header.x-dd-apigw-domain-prefix": "context.domainPrefix",
          "integration.request.header.x-dd-apigw-error-message": "context.error.message",
          "integration.request.header.x-dd-proxy-httpmethod": "context.httpMethod",
          "integration.request.header.x-dd-apigw-identity-useragent": "context.identity.userAgent",
          "integration.request.header.x-dd-proxy-path": "context.path",
          "integration.request.header.x-dd-apigw-protocol": "context.protocol",
          "integration.request.header.x-dd-proxy-stage": "context.stage",
        }
      },
      uri: `http://${loadBalancer.loadBalancerDnsName}`,
    });

    api.root.addMethod('ANY', integration);

    // Output the task public IP
    new cdk.CfnOutput(this, 'Nev-ExpressFargateService', {
      value: service.serviceName,
      description: 'Name of the Fargate service',
    });

    // Output the ALB DNS Name
    new cdk.CfnOutput(this, 'LoadBalancerDNS', {
      value: loadBalancer.loadBalancerDnsName,
      description: 'Application Load Balancer DNS Name',
    });

    // Output the ALB SecurityGroup
    new cdk.CfnOutput(this, 'AlbSecurityGroupId', {
      value: albSecurityGroup.securityGroupId,
      description: 'Application Load Balancer DNS Name',
    });

    // Output API Gateway URL
    new cdk.CfnOutput(this, 'ApiGatewayURL', {
      value: api.url,
      description: 'API Gateway URL',
    });
  }
} 

