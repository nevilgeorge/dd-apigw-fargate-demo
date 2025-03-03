"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.EcsFargateStack = void 0;
const cdk = require("aws-cdk-lib");
const ec2 = require("aws-cdk-lib/aws-ec2");
const ecs = require("aws-cdk-lib/aws-ecs");
const elbv2 = require("aws-cdk-lib/aws-elasticloadbalancingv2");
class EcsFargateStack extends cdk.Stack {
    constructor(scope, id, props) {
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
        // Add container to task definition
        const container = taskDefinition.addContainer('ExpressAppContainer', {
            image: ecs.ContainerImage.fromAsset('../app', {
                buildArgs: {
                    PLATFORM: 'linux/amd64'
                },
                platform: cdk.aws_ecr_assets.Platform.LINUX_AMD64,
            }),
            environment: {
                NODE_ENV: 'production',
            },
            logging: ecs.LogDrivers.awsLogs({ streamPrefix: 'Nev-ExpressApp' }),
        });
        container.addPortMappings({
            containerPort: 3000,
        });
        // Create Security Group for ALB
        const albSecurityGroup = new ec2.SecurityGroup(this, 'ALBSecurityGroup', {
            vpc,
            allowAllOutbound: true,
            description: 'Security group for ALB',
        });
        // Allow inbound HTTP (port 80) traffic to the ALB
        albSecurityGroup.addIngressRule(ec2.Peer.anyIpv4(), ec2.Port.tcp(80), 'Allow HTTP traffic');
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
            desiredCount: 1,
            assignPublicIp: true,
            securityGroups: [serviceSecurityGroup],
        });
        // Attach Fargate Service to the ALB Target Group
        listener.addTargets('FargateTargetGroup', {
            port: 3000, // Forward requests to container
            targets: [service],
            healthCheck: {
                path: '/health', // Change this if your health check route is different
                interval: cdk.Duration.seconds(30),
            },
        });
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
    }
}
exports.EcsFargateStack = EcsFargateStack;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZWNzLWZhcmdhdGUtc3RhY2suanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyJlY3MtZmFyZ2F0ZS1zdGFjay50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7QUFBQSxtQ0FBbUM7QUFDbkMsMkNBQTJDO0FBQzNDLDJDQUEyQztBQUMzQyxnRUFBZ0U7QUFHaEUsTUFBYSxlQUFnQixTQUFRLEdBQUcsQ0FBQyxLQUFLO0lBQzVDLFlBQVksS0FBZ0IsRUFBRSxFQUFVLEVBQUUsS0FBc0I7UUFDOUQsS0FBSyxDQUFDLEtBQUssRUFBRSxFQUFFLEVBQUUsS0FBSyxDQUFDLENBQUM7UUFFeEIsYUFBYTtRQUNiLE1BQU0sR0FBRyxHQUFHLElBQUksR0FBRyxDQUFDLEdBQUcsQ0FBQyxJQUFJLEVBQUUsc0JBQXNCLEVBQUU7WUFDcEQsTUFBTSxFQUFFLENBQUM7WUFDVCxXQUFXLEVBQUUsQ0FBQztZQUNkLE9BQU8sRUFBRSx5QkFBeUI7U0FDbkMsQ0FBQyxDQUFDO1FBRUgscUJBQXFCO1FBQ3JCLE1BQU0sT0FBTyxHQUFHLElBQUksR0FBRyxDQUFDLE9BQU8sQ0FBQyxJQUFJLEVBQUUsbUJBQW1CLEVBQUU7WUFDekQsR0FBRztZQUNILFdBQVcsRUFBRSx5QkFBeUI7U0FDdkMsQ0FBQyxDQUFDO1FBRUgseUJBQXlCO1FBQ3pCLE1BQU0sY0FBYyxHQUFHLElBQUksR0FBRyxDQUFDLHFCQUFxQixDQUFDLElBQUksRUFBRSxnQkFBZ0IsRUFBRTtZQUMzRSxjQUFjLEVBQUUsR0FBRztZQUNuQixHQUFHLEVBQUUsR0FBRztTQUNULENBQUMsQ0FBQztRQUVILG1DQUFtQztRQUNuQyxNQUFNLFNBQVMsR0FBRyxjQUFjLENBQUMsWUFBWSxDQUFDLHFCQUFxQixFQUFFO1lBQ25FLEtBQUssRUFBRSxHQUFHLENBQUMsY0FBYyxDQUFDLFNBQVMsQ0FBQyxRQUFRLEVBQUU7Z0JBQzVDLFNBQVMsRUFBRTtvQkFDUCxRQUFRLEVBQUUsYUFBYTtpQkFDMUI7Z0JBQ0QsUUFBUSxF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QUNsRCxDQUFDLENBQUM7SUFDTCxDQUFDO0NBQ0Y7QUF6R0QsMENBeUdDIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0ICogYXMgY2RrIGZyb20gJ2F3cy1jZGstbGliJztcbmltcG9ydCAqIGFzIGVjMiBmcm9tICdhd3MtY2RrLWxpYi9hd3MtZWMyJztcbmltcG9ydCAqIGFzIGVjcyBmcm9tICdhd3MtY2RrLWxpYi9hd3MtZWNzJztcbmltcG9ydCAqIGFzIGVsYnYyIGZyb20gJ2F3cy1jZGstbGliL2F3cy1lbGFzdGljbG9hZGJhbGFuY2luZ3YyJztcbmltcG9ydCB7IENvbnN0cnVjdCB9IGZyb20gJ2NvbnN0cnVjdHMnO1xuXG5leHBvcnQgY2xhc3MgRWNzRmFyZ2F0ZVN0YWNrIGV4dGVuZHMgY2RrLlN0YWNrIHtcbiAgY29uc3RydWN0b3Ioc2NvcGU6IENvbnN0cnVjdCwgaWQ6IHN0cmluZywgcHJvcHM/OiBjZGsuU3RhY2tQcm9wcykge1xuICAgIHN1cGVyKHNjb3BlLCBpZCwgcHJvcHMpO1xuXG4gICAgLy8gQ3JlYXRlIFZQQ1xuICAgIGNvbnN0IHZwYyA9IG5ldyBlYzIuVnBjKHRoaXMsICdTZXJ2ZXJsZXNzQXBtRGVtb1ZwYycsIHtcbiAgICAgIG1heEF6czogMixcbiAgICAgIG5hdEdhdGV3YXlzOiAxLFxuICAgICAgdnBjTmFtZTogJ3NlcnZlcmxlc3MtYXBtLWRlbW8tdnBjJyxcbiAgICB9KTtcblxuICAgIC8vIENyZWF0ZSBFQ1MgQ2x1c3RlclxuICAgIGNvbnN0IGNsdXN0ZXIgPSBuZXcgZWNzLkNsdXN0ZXIodGhpcywgJ0V4cHJlc3NBcHBDbHVzdGVyJywge1xuICAgICAgdnBjLFxuICAgICAgY2x1c3Rlck5hbWU6ICduZXYtZXhwcmVzcy1hcHAtY2x1c3RlcicsXG4gICAgfSk7XG5cbiAgICAvLyBDcmVhdGUgVGFzayBEZWZpbml0aW9uXG4gICAgY29uc3QgdGFza0RlZmluaXRpb24gPSBuZXcgZWNzLkZhcmdhdGVUYXNrRGVmaW5pdGlvbih0aGlzLCAnRXhwcmVzc0FwcFRhc2snLCB7XG4gICAgICBtZW1vcnlMaW1pdE1pQjogNTEyLFxuICAgICAgY3B1OiAyNTYsXG4gICAgfSk7XG5cbiAgICAvLyBBZGQgY29udGFpbmVyIHRvIHRhc2sgZGVmaW5pdGlvblxuICAgIGNvbnN0IGNvbnRhaW5lciA9IHRhc2tEZWZpbml0aW9uLmFkZENvbnRhaW5lcignRXhwcmVzc0FwcENvbnRhaW5lcicsIHtcbiAgICAgIGltYWdlOiBlY3MuQ29udGFpbmVySW1hZ2UuZnJvbUFzc2V0KCcuLi9hcHAnLCB7XG4gICAgICAgIGJ1aWxkQXJnczoge1xuICAgICAgICAgICAgUExBVEZPUk06ICdsaW51eC9hbWQ2NCdcbiAgICAgICAgfSxcbiAgICAgICAgcGxhdGZvcm06IGNkay5hd3NfZWNyX2Fzc2V0cy5QbGF0Zm9ybS5MSU5VWF9BTUQ2NCxcbiAgICAgIH0pLFxuICAgICAgZW52aXJvbm1lbnQ6IHtcbiAgICAgICAgTk9ERV9FTlY6ICdwcm9kdWN0aW9uJyxcbiAgICAgIH0sXG4gICAgICBsb2dnaW5nOiBlY3MuTG9nRHJpdmVycy5hd3NMb2dzKHsgc3RyZWFtUHJlZml4OiAnTmV2LUV4cHJlc3NBcHAnIH0pLFxuICAgIH0pO1xuXG4gICAgY29udGFpbmVyLmFkZFBvcnRNYXBwaW5ncyh7XG4gICAgICBjb250YWluZXJQb3J0OiAzMDAwLFxuICAgIH0pO1xuXG4gICAgLy8gQ3JlYXRlIFNlY3VyaXR5IEdyb3VwIGZvciBBTEJcbiAgICBjb25zdCBhbGJTZWN1cml0eUdyb3VwID0gbmV3IGVjMi5TZWN1cml0eUdyb3VwKHRoaXMsICdBTEJTZWN1cml0eUdyb3VwJywge1xuICAgICAgdnBjLFxuICAgICAgYWxsb3dBbGxPdXRib3VuZDogdHJ1ZSxcbiAgICAgIGRlc2NyaXB0aW9uOiAnU2VjdXJpdHkgZ3JvdXAgZm9yIEFMQicsXG4gICAgfSk7XG5cbiAgICAvLyBBbGxvdyBpbmJvdW5kIEhUVFAgKHBvcnQgODApIHRyYWZmaWMgdG8gdGhlIEFMQlxuICAgIGFsYlNlY3VyaXR5R3JvdXAuYWRkSW5ncmVzc1J1bGUoZWMyLlBlZXIuYW55SXB2NCgpLCBlYzIuUG9ydC50Y3AoODApLCAnQWxsb3cgSFRUUCB0cmFmZmljJyk7XG5cbiAgICAvLyBDcmVhdGUgQXBwbGljYXRpb24gTG9hZCBCYWxhbmNlciAoQUxCKVxuICAgIGNvbnN0IGxvYWRCYWxhbmNlciA9IG5ldyBlbGJ2Mi5BcHBsaWNhdGlvbkxvYWRCYWxhbmNlcih0aGlzLCAnRXhwcmVzc0FwcEFMQicsIHtcbiAgICAgIHZwYyxcbiAgICAgIGludGVybmV0RmFjaW5nOiB0cnVlLFxuICAgICAgc2VjdXJpdHlHcm91cDogYWxiU2VjdXJpdHlHcm91cCwgLy8gQXR0YWNoIHRoZSBBTEIgc2VjdXJpdHkgZ3JvdXBcbiAgICB9KTtcblxuICAgIC8vIENyZWF0ZSBhIExpc3RlbmVyIG9uIHRoZSBBTEJcbiAgICBjb25zdCBsaXN0ZW5lciA9IGxvYWRCYWxhbmNlci5hZGRMaXN0ZW5lcignQWxiTGlzdGVuZXInLCB7XG4gICAgICBwb3J0OiA4MCwgLy8gSFRUUCBMaXN0ZW5lclxuICAgICAgb3BlbjogdHJ1ZSxcbiAgICB9KTtcblxuICAgIC8vIENyZWF0ZSBTZWN1cml0eSBHcm91cCBmb3IgRmFyZ2F0ZSBTZXJ2aWNlXG4gICAgY29uc3Qgc2VydmljZVNlY3VyaXR5R3JvdXAgPSBuZXcgZWMyLlNlY3VyaXR5R3JvdXAodGhpcywgJ0V4cHJlc3NBcHBTZWN1cml0eUdyb3VwJywge1xuICAgICAgICB2cGMsXG4gICAgICAgIGFsbG93QWxsT3V0Ym91bmQ6IHRydWUsXG4gICAgICAgIGRlc2NyaXB0aW9uOiAnRXhwcmVzcyBBcHAgU2VjdXJpdHkgR3JvdXAnLFxuICAgIH0pOyBcbiAgICBcbiAgICBzZXJ2aWNlU2VjdXJpdHlHcm91cC5hZGRJbmdyZXNzUnVsZShlYzIuUGVlci5hbnlJcHY0KCksIGVjMi5Qb3J0LnRjcCgzMDAwKSwgJ0FsbG93IEV4cHJlc3MgQXBwIHRyYWZmaWMnKTtcblxuICAgIC8vIENyZWF0ZSBGYXJnYXRlIFNlcnZpY2VcbiAgICBjb25zdCBzZXJ2aWNlID0gbmV3IGVjcy5GYXJnYXRlU2VydmljZSh0aGlzLCAnRXhwcmVzc0FwcFNlcnZpY2UnLCB7XG4gICAgICBjbHVzdGVyLFxuICAgICAgdGFza0RlZmluaXRpb24sXG4gICAgICBkZXNpcmVkQ291bnQ6IDEsXG4gICAgICBhc3NpZ25QdWJsaWNJcDogdHJ1ZSxcbiAgICAgIHNlY3VyaXR5R3JvdXBzOiBbc2VydmljZVNlY3VyaXR5R3JvdXBdLFxuICAgIH0pO1xuXG4gICAgLy8gQXR0YWNoIEZhcmdhdGUgU2VydmljZSB0byB0aGUgQUxCIFRhcmdldCBHcm91cFxuICAgIGxpc3RlbmVyLmFkZFRhcmdldHMoJ0ZhcmdhdGVUYXJnZXRHcm91cCcsIHtcbiAgICAgIHBvcnQ6IDMwMDAsIC8vIEZvcndhcmQgcmVxdWVzdHMgdG8gY29udGFpbmVyXG4gICAgICB0YXJnZXRzOiBbc2VydmljZV0sXG4gICAgICBoZWFsdGhDaGVjazoge1xuICAgICAgICBwYXRoOiAnL2hlYWx0aCcsIC8vIENoYW5nZSB0aGlzIGlmIHlvdXIgaGVhbHRoIGNoZWNrIHJvdXRlIGlzIGRpZmZlcmVudFxuICAgICAgICBpbnRlcnZhbDogY2RrLkR1cmF0aW9uLnNlY29uZHMoMzApLFxuICAgICAgfSxcbiAgICB9KTtcblxuXG4gICAgLy8gT3V0cHV0IHRoZSB0YXNrIHB1YmxpYyBJUFxuICAgIG5ldyBjZGsuQ2ZuT3V0cHV0KHRoaXMsICdOZXYtRXhwcmVzc0ZhcmdhdGVTZXJ2aWNlJywge1xuICAgICAgdmFsdWU6IHNlcnZpY2Uuc2VydmljZU5hbWUsXG4gICAgICBkZXNjcmlwdGlvbjogJ05hbWUgb2YgdGhlIEZhcmdhdGUgc2VydmljZScsXG4gICAgfSk7XG5cbiAgICAvLyBPdXRwdXQgdGhlIEFMQiBETlMgTmFtZVxuICAgIG5ldyBjZGsuQ2ZuT3V0cHV0KHRoaXMsICdMb2FkQmFsYW5jZXJETlMnLCB7XG4gICAgICB2YWx1ZTogbG9hZEJhbGFuY2VyLmxvYWRCYWxhbmNlckRuc05hbWUsXG4gICAgICBkZXNjcmlwdGlvbjogJ0FwcGxpY2F0aW9uIExvYWQgQmFsYW5jZXIgRE5TIE5hbWUnLFxuICAgIH0pO1xuICB9XG59ICJdfQ==