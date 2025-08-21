import React, { createContext, useState, ReactNode } from "react"
import { getDefaultFlow } from "../constants/Default"
import { Step, Flow, FlowContextProps } from "../types/Types"

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
