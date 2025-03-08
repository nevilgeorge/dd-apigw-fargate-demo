#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from 'aws-cdk-lib';
import { EcsFargateStack } from '../lib/ecs-fargate-stack';

const app = new cdk.App();
new EcsFargateStack(app, 'ApigwFargateDemoAppStack', {
  env: {region: 'ap-northeast-1'},
}); 