import React, { useState, useEffect } from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import AuthWrapper, { UserDetail } from './components/AuthWrapper';
import Flow from './components/Flow';
import { fetchFlowUrl, createFlowUrl } from './api/ApiEndpoints';
import { Flow as FlowType } from './types/Types';

const App = () => {
  const [flowData, setFlowData] = useState<FlowType | null>(null);
  const [isLoadingFlow, setIsLoadingFlow] = useState<boolean>(false);
  const [flowError, setFlowError] = useState<string>("");

  const flowConfig = {
    merchant_id: "avirup_test",
    merchant_type: "F1",
    product_name: "PP",
    scenario: "onboarding",
  };

  const handleAuthFailure = (error: string) => {
    console.error('Authentication failed:', error);
  };

  const fetchFlow = async () => {
    setIsLoadingFlow(true);
    setFlowError("");
    
    try {
      const flowResponse = await fetch(fetchFlowUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(flowConfig),
      });

      if (flowResponse.status === 404) {
        await createFlow();
        return;
      }

      if (!flowResponse.ok) {
        throw new Error(`Flow fetch failed: ${flowResponse.status}`);
      }

      const flowData: FlowType = await flowResponse.json();
      setFlowData(flowData);

    } catch (error) {
      console.error("Error fetching flow:", error);
      setFlowError(error instanceof Error ? error.message : "Failed to fetch flow");
    } finally {
      setIsLoadingFlow(false);
    }
  };

  const createFlow = async () => {
    try {
      const createResponse = await fetch(createFlowUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(flowConfig),
      });

      if (!createResponse.ok) {
        throw new Error(`Flow creation failed: ${createResponse.status}`);
      }

      const newFlowData: FlowType = await createResponse.json();
      setFlowData(newFlowData);

    } catch (error) {
      setFlowError(error instanceof Error ? error.message : "Failed to create flow");
    }
  };

  useEffect(() => {
    fetchFlow();
  }, []);

  const customLoadingComponent = (
    <div className="min-h-screen flex flex-col items-center justify-center p-5 bg-gray-100 text-center">
      <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mb-4"></div>
      <h3 className="text-lg font-semibold text-gray-800 mb-2">Verifying your credentials...</h3>
      <p className="text-gray-600">Please wait while we authenticate you.</p>
    </div>
  );

  const customErrorComponent = (error: string) => (
    <div className="min-h-screen flex flex-col items-center justify-center p-5 bg-gray-100 text-center">
      <h3 className="text-xl font-semibold text-red-600 mb-2">🔒 Access Denied</h3>
      <p className="text-gray-600 mb-4">Unable to authenticate: {error}</p>
      <button 
        className="px-6 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
        onClick={() => window.location.reload()}
      >
        Try Again
      </button>
    </div>
  );

  const flowLoadingComponent = (
    <div className="min-h-screen flex flex-col items-center justify-center p-5 bg-gray-100 text-center">
      <div className="w-8 h-8 border-4 border-green-500 border-t-transparent rounded-full animate-spin mb-4"></div>
      <h3 className="text-lg font-semibold text-gray-800 mb-2">Loading your flow...</h3>
      <p className="text-gray-600">Please wait while we fetch your onboarding steps.</p>
    </div>
  );

  const flowErrorComponent = (
    <div className="min-h-screen flex flex-col items-center justify-center p-5 bg-gray-100 text-center">
      <h3 className="text-xl font-semibold text-red-600 mb-2">⚠️ Flow Load Error</h3>
      <p className="text-gray-600 mb-4">Unable to load flow: {flowError}</p>
      <button 
        className="px-6 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors"
        onClick={fetchFlow}
      >
        Retry Flow Load
      </button>
    </div>
  );

  // Show flow loading state
  if (isLoadingFlow) {
    return flowLoadingComponent;
  }

  // Show flow error state
  if (flowError) {
    return flowErrorComponent;
  }

  // Show main app when flow is loaded
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100">
      <AuthWrapper
        onAuthFailure={handleAuthFailure}
        loadingComponent={customLoadingComponent}
        errorComponent={customErrorComponent}
      >
        {(user: UserDetail) => (
          <Flow
            title={flowData?.scenario}
            steps={flowData?.steps.map(step => step)}
            user={user}
          />
        )}
      </AuthWrapper>
    </div>
  );
};

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);