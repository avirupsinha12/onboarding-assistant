import { Flow, Step } from "../types/Types"

export const defaultStep: Step = {
  id: "",
  type: "DEFAULT",
  blocked_by_step_ids: undefined,
  blocking_step_ids: undefined,
  parent_step_id: undefined,
  child_step_ids: undefined,
  status: "NOTHING",
  template_step_id: undefined,
  assignee_id: undefined,
  unblocked_at: undefined,
  completed_by: undefined,
  contents: [],
  fall_back_step_id: undefined,
  time_needed: undefined,
  name: undefined,
  position: undefined,
}

export function getDefaultFlow(): Flow {
  const rootStepId = "root-step-1";
  const setupStepId = "setup-step-1";
  const configStepId = "config-step-1";
  const testingStepId = "testing-step-1";
  const lastStepId = "deployment-step-1";
  
  // Child steps
  const setupSubStep1 = "setup-substep-1";
  const setupSubStep2 = "setup-substep-2";
  const configSubStep1 = "config-substep-1";
  const configSubStep2 = "config-substep-2";
  const testingSubStep1 = "testing-substep-1";
  const deploymentSubStep1 = "deployment-substep-1";

  const defaultSteps: Step[] = [
    {
      id: rootStepId,
      type: "ROOT",
      status: "DONE",
      blocking_step_ids: [setupStepId],
      child_step_ids: [setupSubStep1],
      contents: [
        {
          id: "content-root-1",
          template_scope_id: "root-template",
          display: "Getting Started",
          content_type: "PRIMARY_TEXT"
        },
        {
          id: "content-root-2",
          template_scope_id: "root-template",
          display: "Welcome to the BBPS integration process. This guide will walk you through setting up your integration step by step.",
          content_type: "SECONDARY_TEXT"
        }
      ],
      name: "Getting Started",
      position: 1,
      time_needed: "00:05:00"
    },
    {
      id: setupStepId,
      type: "MAIN",
      status: "PENDING",
      blocked_by_step_ids: [rootStepId],
      blocking_step_ids: [configStepId],
      child_step_ids: [setupSubStep1, setupSubStep2],
      contents: [
        {
          id: "content-setup-1",
          template_scope_id: "setup-template",
          display: "Environment Setup",
          content_type: "PRIMARY_TEXT"
        }
      ],
      name: "Environment Setup",
      position: 2,
      time_needed: "00:15:00"
    },
    {
      id: setupSubStep1,
      type: "SUB",
      status: "PENDING",
      parent_step_id: setupStepId,
      contents: [
        {
          id: "content-setup-sub1-1",
          template_scope_id: "setup-sub-template",
          display: "Install Dependencies",
          content_type: "PRIMARY_TEXT"
        },
        {
          id: "content-setup-sub1-2",
          template_scope_id: "setup-sub-template",
          display: "Install the required packages and dependencies for your BBPS integration. Run <code>npm install</code> to get started.",
          content_type: "SECONDARY_TEXT"
        }
      ],
      name: "Install Dependencies",
      position: 1,
      time_needed: "00:05:00"
    },
    {
      id: setupSubStep2,
      type: "SUB",
      status: "PENDING",
      parent_step_id: setupStepId,
      contents: [
        {
          id: "content-setup-sub2-1",
          template_scope_id: "setup-sub-template",
          display: "Configure Environment Variables",
          content_type: "PRIMARY_TEXT"
        },
        {
          id: "content-setup-sub2-2",
          template_scope_id: "setup-sub-template",
          display: "Set up your environment variables including API keys, endpoints, and merchant configuration details.",
          content_type: "SECONDARY_TEXT"
        }
      ],
      name: "Configure Environment Variables",
      position: 2,
      time_needed: "00:10:00"
    },
    {
      id: configStepId,
      type: "MAIN",
      status: "UPCOMING",
      blocked_by_step_ids: [setupStepId],
      blocking_step_ids: [testingStepId],
      child_step_ids: [configSubStep1, configSubStep2],
      contents: [
        {
          id: "content-config-1",
          template_scope_id: "config-template",
          display: "API Configuration",
          content_type: "PRIMARY_TEXT"
        }
      ],
      name: "API Configuration",
      position: 3,
      time_needed: "00:20:00"
    },
    {
      id: configSubStep1,
      type: "SUB",
      status: "UPCOMING",
      parent_step_id: configStepId,
      contents: [
        {
          id: "content-config-sub1-1",
          template_scope_id: "config-sub-template",
          display: "Set up BBPS API Endpoints",
          content_type: "PRIMARY_TEXT"
        },
        {
          id: "content-config-sub1-2",
          template_scope_id: "config-sub-template",
          display: "Configure the BBPS API endpoints and authentication settings in your application.",
          content_type: "SECONDARY_TEXT"
        }
      ],
      name: "Set up BBPS API Endpoints",
      position: 1,
      time_needed: "00:10:00"
    },
    {
      id: configSubStep2,
      type: "SUB",
      status: "UPCOMING",
      parent_step_id: configStepId,
      contents: [
        {
          id: "content-config-sub2-1",
          template_scope_id: "config-sub-template",
          display: "Configure Merchant Settings",
          content_type: "PRIMARY_TEXT"
        },
        {
          id: "content-config-sub2-2",
          template_scope_id: "config-sub-template",
          display: "Set up merchant-specific configurations including payment categories and billing settings.",
          content_type: "SECONDARY_TEXT"
        }
      ],
      name: "Configure Merchant Settings",
      position: 2,
      time_needed: "00:10:00"
    },
    {
      id: testingStepId,
      type: "MAIN",
      status: "UPCOMING",
      blocked_by_step_ids: [configStepId],
      blocking_step_ids: [lastStepId],
      child_step_ids: [testingSubStep1],
      contents: [
        {
          id: "content-testing-1",
          template_scope_id: "testing-template",
          display: "Testing & Validation",
          content_type: "PRIMARY_TEXT"
        }
      ],
      name: "Testing & Validation",
      position: 4,
      time_needed: "00:25:00"
    },
    {
      id: testingSubStep1,
      type: "SUB",
      status: "UPCOMING",
      parent_step_id: testingStepId,
      contents: [
        {
          id: "content-testing-sub1-1",
          template_scope_id: "testing-sub-template",
          display: "Run Integration Tests",
          content_type: "PRIMARY_TEXT"
        },
        {
          id: "content-testing-sub1-2",
          template_scope_id: "testing-sub-template",
          display: "Execute comprehensive tests to validate your BBPS integration including payment processing and status updates.",
          content_type: "SECONDARY_TEXT"
        }
      ],
      name: "Run Integration Tests",
      position: 1,
      time_needed: "00:25:00"
    },
    {
      id: lastStepId,
      type: "MAIN",
      status: "UPCOMING",
      blocked_by_step_ids: [testingStepId],
      child_step_ids: [deploymentSubStep1],
      contents: [
        {
          id: "content-deployment-1",
          template_scope_id: "deployment-template",
          display: "Go Live",
          content_type: "PRIMARY_TEXT"
        }
      ],
      name: "Go Live",
      position: 5,
      time_needed: "00:10:00"
    },
    {
      id: deploymentSubStep1,
      type: "SUB",
      status: "UPCOMING",
      parent_step_id: lastStepId,
      contents: [
        {
          id: "content-deployment-sub1-1",
          template_scope_id: "deployment-sub-template",
          display: "Deploy to Production",
          content_type: "PRIMARY_TEXT"
        },
        {
          id: "content-deployment-sub1-2",
          template_scope_id: "deployment-sub-template",
          display: "Deploy your BBPS integration to production and monitor the initial transactions.",
          content_type: "SECONDARY_TEXT"
        }
      ],
      name: "Deploy to Production",
      position: 1,
      time_needed: "00:10:00"
    }
  ];

  return {
    id: "default-flow-1",
    merchant_id: "default-merchant",
    flow_id: "bbps-integration-flow",
    scenario: "bbps-onboarding",
    root_step_id: rootStepId,
    last_step_id: lastStepId,
    product_info_id: "bbps-product-info",
    steps: defaultSteps
  };
}