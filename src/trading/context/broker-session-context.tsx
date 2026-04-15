import { createContext, useContext, useMemo, useState } from 'react';
import { AngelOneClient } from '../angelone/client';
import { AngelCredentials, AngelSessionState, AngelSessionTokens } from '../angelone/types';

type BrokerSessionContextValue = {
  state: AngelSessionState;
  angelClient: AngelOneClient;
  setCredentials: (credentials: AngelCredentials | null) => void;
  setTokens: (tokens: AngelSessionTokens | null) => void;
  clearSession: () => void;
};

const BrokerSessionContext = createContext<BrokerSessionContextValue | null>(null);

type Props = {
  children: React.ReactNode;
};

export function BrokerSessionProvider({ children }: Props) {
  const [state, setState] = useState<AngelSessionState>({
    credentials: null,
    tokens: null,
  });

  const value = useMemo<BrokerSessionContextValue>(() => {
    const angelClient = new AngelOneClient(
      () => state,
      (nextState) => setState(nextState)
    );

    return {
      state,
      angelClient,
      setCredentials: (credentials) => {
        setState((current) => ({
          credentials,
          tokens: credentials ? current.tokens : null,
        }));
      },
      setTokens: (tokens) => {
        setState((current) => ({
          credentials: current.credentials,
          tokens,
        }));
      },
      clearSession: () => {
        setState({ credentials: null, tokens: null });
      },
    };
  }, [state]);

  return (
    <BrokerSessionContext.Provider value={value}>{children}</BrokerSessionContext.Provider>
  );
}

export function useBrokerSession() {
  const context = useContext(BrokerSessionContext);

  if (!context) {
    throw new Error('useBrokerSession must be used inside BrokerSessionProvider');
  }

  return context;
}
