import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { useWallet } from '@/hooks/use-wallet';
import { useI18n } from '@/lib/i18n';
import { Wallet } from 'lucide-react';

export function WalletPickerDialog() {
  const { wallets, walletPickerOpen, setWalletPickerOpen, connectWallet, isConnecting } = useWallet();
  const { t } = useI18n();
  return (
    <Dialog open={walletPickerOpen} onOpenChange={setWalletPickerOpen}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{t('wallet.picker.title')}</DialogTitle>
          <DialogDescription>
            {wallets.length ? t('wallet.picker.subtitle') : t('wallet.picker.none')}
          </DialogDescription>
        </DialogHeader>
        {wallets.length > 0 ? <div className="grid gap-2">
          {wallets.map(wallet => <Button key={wallet.info.uuid} variant="outline" disabled={isConnecting} onClick={() => void connectWallet(wallet)} className="h-auto justify-start gap-3 px-3 py-3 text-left">
            {wallet.info.icon ? <img src={wallet.info.icon} alt="" className="h-8 w-8 rounded-md" /> : <Wallet className="h-8 w-8 text-primary" />}
            <span className="min-w-0"><span className="block font-medium">{wallet.info.name}</span></span>
          </Button>)}
        </div> : <div className="flex flex-col items-center gap-3 rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground"><Wallet className="h-8 w-8" /><p>{t('wallet.picker.install')}</p></div>}
      </DialogContent>
    </Dialog>
  );
}
