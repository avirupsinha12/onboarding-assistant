import React, { createContext, useState, ReactNode } from "react"
import { getDefaultFlow } from "../constants/Default"

export type Status =
  | "UPCOMING"
  | "SCHEDULED"
  | "PENDING"
  | "DONE"
  | "BLOCKED"
  | "OVERDUE"
  | "INCOMPLETE"
  | "IN_REVIEW"
  | "NOTHING"
  | "ADHOC_DONE"
  | "HIDDEN"

export type Content = {
  id: string
  template_scope_id: string
  display: string
  content_type: string
}

export type Step = {
  id: string
  type: string
  blocked_by_step_ids?: string[]
  blocking_step_ids?: string[]
  parent_step_id?: string
  child_step_ids?: string[]
  status: Status
  assignee_id?: string
  template_step_id?: string
  unblocked_at?: string
  completed_by?: string
  completed_at?: string
  contents: Content[]
  fall_back_step_id?: string
  time_needed?: string
  name?: string
  position?: number
}

export type Flow = {
  id: string
  merchant_id: string
  flow_id: string
  scenario: string
  root_step_id: string
  last_step_id: string
  product_info_id: string
  steps: Step[]
}

interface FlowContextProps {
  flow: Flow
  setFlow: (flow: Flow) => void
  activeSubStep: Step | null
  setActiveSubStep: (step: Step | null) => void
}

const defaultValue: FlowContextProps = {
  flow: getDefaultFlow(),
  setFlow: () => {},
  activeSubStep: null,
  setActiveSubStep: () => {},
}

export const FlowContext = createContext<FlowContextProps>(defaultValue)

interface ProviderProps {
  children: ReactNode
}

export const FlowProvider: React.FC<ProviderProps> = ({ children }) => {
  const [flow, setFlow] = useState<Flow>(getDefaultFlow())
  const [activeSubStep, setActiveSubStep] = useState<Step | null>(null)

  const setWorkFlow = (newFlow: Flow) => {
    setFlow(newFlow)
  }

  const setActiveWorkflowSubStep = (newStep: Step | null) => {
    setActiveSubStep(newStep)
  }

  return (
    <FlowContext.Provider
      value={{
        flow,
        setFlow: setWorkFlow,
        activeSubStep,
        setActiveSubStep: setActiveWorkflowSubStep,
      }}
    >
      {children}
    </FlowContext.Provider>
  )
}
