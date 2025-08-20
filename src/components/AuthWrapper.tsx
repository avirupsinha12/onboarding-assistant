import React, { useEffect, useState, useContext } from 'react';
import { FlowContext } from '../context/FlowProvider';
import { getDefaultFlow } from '../constants/Default';

export interface UserDetail {
  id: string;
  name: string;
  email: string;
  role: string;
}

export interface AuthWrapperProps {
  children: (user: UserDetail) => React.ReactNode;
  onAuthFailure?: (error: string) => void;
  loadingComponent?: React.ReactNode;
  errorComponent?: (error: string) => React.ReactNode;
}

const AuthWrapper: React.FC<AuthWrapperProps> = ({
  children,
  onAuthFailure,
  loadingComponent,
  errorComponent
}) => {
  const { flow, setFlow } = useContext(FlowContext);
  const [user, setUser] = useState<UserDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const validateUser = async (): Promise<UserDetail> => {
    // Simulate API call delay
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Mock validation - currently always returns a valid user
    // In real implementation, this would make an actual API call
    try {
      // Simulate potential API failure (uncomment to test error handling)
      // if (Math.random() > 0.8) {
      //   throw new Error('Authentication failed');
      // }
      
      const mockUser: UserDetail = {
        id: '123',
        name: 'John Doe',
        email: 'john.doe@example.com',
        role: 'user'
      };
      
      return mockUser;
    } catch (err) {
      throw new Error(err instanceof Error ? err.message : 'Authentication failed');
    }
  };

  useEffect(() => {
    const authenticate = async () => {
      try {
        setLoading(true);
        setError(null);
        const userData = await validateUser();
        setUser(userData);
        const defaultFlow = getDefaultFlow();
        setFlow(defaultFlow);
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Authentication failed';
        setError(errorMessage);
        onAuthFailure?.(errorMessage);
      } finally {
        setLoading(false);
      }
    };

    authenticate();
  }, [onAuthFailure, flow, setFlow]);

  if (loading) {
    return (
      <div>
        {loadingComponent || (
          <div className="min-h-screen flex flex-col items-center justify-center p-5 bg-gray-100">
            <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mb-4"></div>
            <p className="text-gray-600">Authenticating...</p>
          </div>
        )}
      </div>
    );
  }

  if (error) {
    return (
      <div>
        {errorComponent ? errorComponent(error) : (
          <div className="min-h-screen flex flex-col items-center justify-center p-5 bg-gray-100 text-center">
            <h3 className="text-xl font-semibold text-red-600 mb-2">Authentication Error</h3>
            <p className="text-gray-600 mb-4">{error}</p>
            <button 
              className="px-6 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
              onClick={() => window.location.reload()}
            >
              Retry
            </button>
          </div>
        )}
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-5 bg-gray-100 text-center">
        <h3 className="text-xl font-semibold text-red-600 mb-2">Authentication Required</h3>
        <p className="text-gray-600 mb-4">Please authenticate to continue.</p>
      </div>
    );
  }

  return <>{children(user)}</>;
};

export default AuthWrapper;