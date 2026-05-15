import React, { createContext, useContext, useMemo } from "react";
import { useNetworkState } from "expo-network";

interface NetworkContextType {
  isOffline: boolean;
  isConnected: boolean | undefined;
  isInternetReachable: boolean | undefined;
}

const NetworkContext = createContext<NetworkContextType | undefined>(undefined);

export function NetworkProvider({ children }: { children: React.ReactNode }) {
  const state = useNetworkState();
  const value = useMemo(() => ({
    isOffline: state.isConnected === false || state.isInternetReachable === false,
    isConnected: state.isConnected,
    isInternetReachable: state.isInternetReachable,
  }), [state.isConnected, state.isInternetReachable]);

  return <NetworkContext.Provider value={value}>{children}</NetworkContext.Provider>;
}

export function useNetworkStatus() {
  const value = useContext(NetworkContext);
  if (!value) throw new Error("useNetworkStatus must be used within NetworkProvider");
  return value;
}
