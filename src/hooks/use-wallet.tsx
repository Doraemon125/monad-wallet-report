import { createContext, useContext, useEffect, useState, useCallback, useRef, ReactNode } from 'react';
import { BrowserProvider } from 'ethers';

export type Network = 'testnet' | 'mainnet';

export interface NetworkConfig {
  chainId: number;
  hexChainId: string;
  name: string;
  currency: string;
  rpc: string;
  explorer: string;
  apiBase: string;
}

export const NETWORKS: Record<Network, NetworkConfig> = {
  testnet: { chainId: 10143, hexChainId: '0x279f', name: 'Monad Testnet', currency: 'MON', rpc: 'https://testnet-rpc.monad.xyz', explorer: 'https://testnet.monadscan.com', apiBase: 'https://api-testnet.monadscan.com/api' },
  mainnet: { chainId: 143, hexChainId: '0x8f', name: 'Monad Mainnet', currency: 'MON', rpc: 'https://rpc.monad.xyz', explorer: 'https://monadscan.com', apiBase: 'https://api.monadscan.com/api' }
};

type Eip1193Provider = {
  request: (args: { method: string; params?: unknown[] | object }) => Promise<unknown>;
  on?: (event: string, listener: (...args: any[]) => void) => void;
  removeListener?: (event: string, listener: (...args: any[]) => void) => void;
};

export interface DiscoveredWallet {
  info: { uuid: string; name: string; icon: string; rdns: string };
  provider: Eip1193Provider;
}

declare global {
  interface Window {
    ethereum?: Eip1193Provider;
  }
}

const LAST_WALLET_KEY = 'monad_last_wallet_rdns';

interface WalletContextType {
  account: string | null;
  network: Network;
  isConnected: boolean;
  isConnecting: boolean;
  provider: BrowserProvider | null;
  error: string | null;
  connectedWallet: DiscoveredWallet['info'] | null;
  wallets: DiscoveredWallet[];
  walletPickerOpen: boolean;
  connect: () => Promise<void>;
  connectWallet: (wallet: DiscoveredWallet) => Promise<void>;
  setWalletPickerOpen: (open: boolean) => void;
  disconnect: () => void;
  switchNetwork: (network: Network) => Promise<void>;
}

const WalletContext = createContext<WalletContextType | undefined>(undefined);

function setNetworkFromChainId(chainId: number, setNetwork: (network: Network) => void) {
  if (chainId === NETWORKS.mainnet.chainId) setNetwork('mainnet');
  if (chainId === NETWORKS.testnet.chainId) setNetwork('testnet');
}

export function WalletProvider({ children }: { children: ReactNode }) {
  const [account, setAccount] = useState<string | null>(null);
  const [network, setNetwork] = useState<Network>('mainnet');
  const [isConnecting, setIsConnecting] = useState(false);
  const [provider, setProvider] = useState<BrowserProvider | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [wallets, setWallets] = useState<DiscoveredWallet[]>([]);
  const [selectedProvider, setSelectedProvider] = useState<Eip1193Provider | null>(null);
  const [connectedWallet, setConnectedWallet] = useState<DiscoveredWallet['info'] | null>(null);
  const [walletPickerOpen, setWalletPickerOpen] = useState(false);
  const autoReconnectAttempted = useRef(false);

  const switchNetwork = useCallback(async (targetNetwork: Network) => {
    if (!selectedProvider) {
      setError('No wallet connected');
      return;
    }
    const config = NETWORKS[targetNetwork];
    try {
      await selectedProvider.request({ method: 'wallet_switchEthereumChain', params: [{ chainId: config.hexChainId }] });
      setNetwork(targetNetwork);
    } catch (switchError: any) {
      if (switchError.code === 4902) {
        try {
          await selectedProvider.request({
            method: 'wallet_addEthereumChain',
            params: [{ chainId: config.hexChainId, chainName: config.name, nativeCurrency: { name: config.currency, symbol: config.currency, decimals: 18 }, rpcUrls: [config.rpc], blockExplorerUrls: [config.explorer] }]
          });
          setNetwork(targetNetwork);
        } catch (addError: any) {
          setError(addError.message || 'Failed to add network');
        }
      } else {
        setError(switchError.message || 'Failed to switch network');
      }
    }
  }, [selectedProvider]);

  const establishConnection = useCallback(async (wallet: DiscoveredWallet | null, requestAccounts: boolean) => {
    const injectedProvider = wallet?.provider ?? (window.ethereum as Eip1193Provider | undefined);
    if (!injectedProvider) {
      setError('Please install an EVM-compatible wallet');
      return;
    }
    setIsConnecting(true);
    setError(null);
    try {
      const accounts = await injectedProvider.request({ method: requestAccounts ? 'eth_requestAccounts' : 'eth_accounts' }) as string[];
      if (!accounts?.length) return;
      const browserProvider = new BrowserProvider(injectedProvider);
      setSelectedProvider(injectedProvider);
      setProvider(browserProvider);
      setAccount(accounts[0]);
      setConnectedWallet(wallet?.info ?? { uuid: 'legacy', name: 'Browser Wallet', icon: '', rdns: 'legacy' });
      if (wallet) localStorage.setItem(LAST_WALLET_KEY, wallet.info.rdns);

      const networkState = await browserProvider.getNetwork();
      const chainId = Number(networkState.chainId);
      if (chainId === NETWORKS.mainnet.chainId || chainId === NETWORKS.testnet.chainId) {
        setNetworkFromChainId(chainId, setNetwork);
      } else if (requestAccounts) {
        const config = NETWORKS.mainnet;
        try {
          await injectedProvider.request({ method: 'wallet_switchEthereumChain', params: [{ chainId: config.hexChainId }] });
          setNetwork('mainnet');
        } catch (switchError: any) {
          if (switchError.code === 4902) {
            await injectedProvider.request({ method: 'wallet_addEthereumChain', params: [{ chainId: config.hexChainId, chainName: config.name, nativeCurrency: { name: config.currency, symbol: config.currency, decimals: 18 }, rpcUrls: [config.rpc], blockExplorerUrls: [config.explorer] }] });
            setNetwork('mainnet');
          } else {
            throw switchError;
          }
        }
      }
    } catch (err: any) {
      setError(err.message || 'Failed to connect wallet');
    } finally {
      setIsConnecting(false);
    }
  }, []);

  const connectWallet = useCallback(async (wallet: DiscoveredWallet) => {
    setWalletPickerOpen(false);
    await establishConnection(wallet, true);
  }, [establishConnection]);

  const connect = useCallback(async () => {
    if (wallets.length === 1) return connectWallet(wallets[0]);
    if (wallets.length > 1) {
      setWalletPickerOpen(true);
      return;
    }
    // EIP-6963 is preferred. This fallback is only reached when none announced.
    if (window.ethereum) return establishConnection(null, true);
    setWalletPickerOpen(true);
  }, [wallets, connectWallet, establishConnection]);

  const disconnect = useCallback(() => {
    localStorage.removeItem(LAST_WALLET_KEY);
    setAccount(null);
    setProvider(null);
    setSelectedProvider(null);
    setConnectedWallet(null);
    setError(null);
  }, []);

  useEffect(() => {
    const announce = (event: Event) => {
      const detail = (event as CustomEvent<DiscoveredWallet>).detail;
      if (!detail?.info?.uuid || !detail.provider) return;
      setWallets(current => current.some(wallet => wallet.info.uuid === detail.info.uuid) ? current : [...current, detail]);
    };
    window.addEventListener('eip6963:announceProvider', announce);
    window.dispatchEvent(new Event('eip6963:requestProvider'));
    return () => window.removeEventListener('eip6963:announceProvider', announce);
  }, []);

  useEffect(() => {
    const lastRdns = localStorage.getItem(LAST_WALLET_KEY);
    if (account || autoReconnectAttempted.current || !lastRdns || wallets.length === 0) return;
    const lastWallet = wallets.find(wallet => wallet.info.rdns === lastRdns);
    if (lastWallet) {
      autoReconnectAttempted.current = true;
      void establishConnection(lastWallet, false);
    }
  }, [wallets, account, establishConnection]);

  useEffect(() => {
    if (!selectedProvider) return;
    const handleAccountsChanged = (accounts: string[]) => accounts.length ? setAccount(accounts[0]) : disconnect();
    const handleChainChanged = (chainId: string) => {
      setNetworkFromChainId(parseInt(chainId, 16), setNetwork);
      setProvider(new BrowserProvider(selectedProvider));
    };
    selectedProvider.on?.('accountsChanged', handleAccountsChanged);
    selectedProvider.on?.('chainChanged', handleChainChanged);
    return () => {
      selectedProvider.removeListener?.('accountsChanged', handleAccountsChanged);
      selectedProvider.removeListener?.('chainChanged', handleChainChanged);
    };
  }, [selectedProvider, disconnect]);

  return <WalletContext.Provider value={{ account, network, isConnected: !!account, isConnecting, provider, error, connectedWallet, wallets, walletPickerOpen, connect, connectWallet, setWalletPickerOpen, disconnect, switchNetwork }}>{children}</WalletContext.Provider>;
}

export function useWallet() {
  const context = useContext(WalletContext);
  if (context === undefined) throw new Error('useWallet must be used within a WalletProvider');
  return context;
}
