import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import AuthWrapper, { UserDetail } from './components/AuthWrapper';
import Flow from './components/Flow';

const App = () => {
  const handleComplete = () => {
    console.log('Flow completed!');
  };

  const handleAuthFailure = (error: string) => {
    console.error('Authentication failed:', error);
  };

  const steps = [
    "Welcome! Let's get you started with our application.",
    "First, let's configure your profile settings.",
    "Next, we'll show you the main features.",
    "Finally, you're all set to begin!"
  ];

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

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100">
      <AuthWrapper
        onAuthFailure={handleAuthFailure}
        loadingComponent={customLoadingComponent}
        errorComponent={customErrorComponent}
      >
        {(user: UserDetail) => (
          <Flow
            title="Welcome to Our App"
            steps={steps}
            onComplete={handleComplete}
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