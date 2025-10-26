import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface PassphraseModalProps {
  open: boolean;
  onClose: () => void;
  onConfirm: (newPassphrase: string) => void;
}

export function PassphraseModal({
  open,
  onClose,
  onConfirm,
}: PassphraseModalProps) {
  const [newPassphrase, setNewPassphrase] = useState("");
  const [confirmPassphrase, setConfirmPassphrase] = useState("");
  const [error, setError] = useState("");

  const handleConfirm = () => {
    setError("");

    if (newPassphrase.length < 6) {
      setError("Passphrase must be at least 6 characters");
      return;
    }

    if (newPassphrase !== confirmPassphrase) {
      setError("Passphrases do not match");
      return;
    }

    onConfirm(newPassphrase);
    setNewPassphrase("");
    setConfirmPassphrase("");
  };

  const handleClose = () => {
    setNewPassphrase("");
    setConfirmPassphrase("");
    setError("");
    onClose();
  };

  const strength = newPassphrase.length >= 12 ? "strong" : newPassphrase.length >= 8 ? "medium" : "weak";

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md font-mono" data-testid="modal-change-passphrase">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl">
            <i className="fa-solid fa-key text-primary" aria-hidden="true" />
            CHANGE PASSPHRASE
          </DialogTitle>
          <DialogDescription className="text-xs space-y-1">
            <p>This will immediately disconnect all other users from the room.</p>
            <p className="text-destructive font-semibold">ALL MESSAGE HISTORY WILL BE CLEARED for security.</p>
            <p>Users will need the new passphrase to rejoin.</p>
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <Alert variant="destructive" className="border-destructive/50">
            <AlertDescription className="text-xs">
              <i className="fa-solid fa-triangle-exclamation mr-2" aria-hidden="true" />
              All connected users will be disconnected
            </AlertDescription>
          </Alert>

          <div className="space-y-2">
            <Label htmlFor="new-passphrase" className="text-xs uppercase tracking-wider">
              New Passphrase
            </Label>
            <Input
              id="new-passphrase"
              type="password"
              value={newPassphrase}
              onChange={(e) => setNewPassphrase(e.target.value)}
              placeholder="Enter new passphrase"
              className="font-mono"
              data-testid="input-new-passphrase"
            />
            {newPassphrase && (
              <div className="flex gap-1 mt-2">
                <div
                  className={`h-1 flex-1 rounded ${
                    strength === "weak"
                      ? "bg-status-busy"
                      : "bg-muted"
                  }`}
                />
                <div
                  className={`h-1 flex-1 rounded ${
                    strength === "medium" || strength === "strong"
                      ? "bg-status-away"
                      : "bg-muted"
                  }`}
                />
                <div
                  className={`h-1 flex-1 rounded ${
                    strength === "strong" ? "bg-status-online" : "bg-muted"
                  }`}
                />
              </div>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="confirm-passphrase" className="text-xs uppercase tracking-wider">
              Confirm Passphrase
            </Label>
            <Input
              id="confirm-passphrase"
              type="password"
              value={confirmPassphrase}
              onChange={(e) => setConfirmPassphrase(e.target.value)}
              placeholder="Confirm new passphrase"
              className="font-mono"
              data-testid="input-confirm-passphrase"
            />
          </div>

          {error && (
            <Alert variant="destructive">
              <AlertDescription className="text-xs">{error}</AlertDescription>
            </Alert>
          )}
        </div>

        <DialogFooter className="gap-2">
          <Button
            variant="outline"
            onClick={handleClose}
            className="font-mono"
            data-testid="button-cancel-passphrase"
          >
            CANCEL
          </Button>
          <Button
            variant="destructive"
            onClick={handleConfirm}
            disabled={!newPassphrase || !confirmPassphrase}
            className="font-mono gap-2"
            data-testid="button-confirm-passphrase"
          >
            <i className="fa-solid fa-rotate text-sm" aria-hidden="true" />
            CHANGE PASSPHRASE
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
