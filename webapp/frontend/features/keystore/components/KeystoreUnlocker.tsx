import React, { useState, useEffect } from "react";
import { useKeystore } from "../hooks/useKeystore";
import { KeystoreLoadingView } from "./KeystoreLoadingView";
import { KeystoreUnlockView } from "./KeystoreUnlockView";
import { KeystoreGenerateView } from "./KeystoreGenerateView";

interface KeystoreUnlockerProps {
  onPublicKeyRetrieved: (publicKey: string) => void;
  onClose?: () => void;
}

export function KeystoreUnlocker({
  onPublicKeyRetrieved,
  onClose,
}: KeystoreUnlockerProps) {
  const { isReady, sendMessage } = useKeystore();

  const [uiMode, setUiMode] = useState<"loading" | "unlock" | "generate">(
    "loading"
  );
  const [keyExists, setKeyExists] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (isReady) {
      sendMessage("checkForExistingKey", undefined)
        .then((response) => {
          setKeyExists(response.keyExists);
          setUiMode(response.keyExists ? "unlock" : "generate");
        })
        .catch(() => setError("Could not connect to the secure keystore."));
    }
  }, [isReady, sendMessage]);

  const handleUnlock = async (passphrase: string) => {
    setError("");
    setIsLoading(true);
    try {
      const result = await sendMessage("unlockAndGetPublicKey", { passphrase });
      onPublicKeyRetrieved(result.publicKey);
      if (onClose) onClose();
    } catch (err) {
      setError(String(err));
    } finally {
      setIsLoading(false);
    }
  };

  const handleGenerate = async (passphrase: string) => {
    setError("");
    setIsLoading(true);
    try {
      const result = await sendMessage("generateInitialKey", { passphrase });
      onPublicKeyRetrieved(result.publicKey);
      if (onClose) onClose();
    } catch (err) {
      setError(String(err));
    } finally {
      setIsLoading(false);
    }
  };

  const renderContent = () => {
    switch (uiMode) {
      case "loading":
        return <KeystoreLoadingView />;
      case "unlock":
        return (
          <KeystoreUnlockView
            onUnlock={handleUnlock}
            onReset={() => setUiMode("generate")}
            isLoading={isLoading}
          />
        );
      case "generate":
        return (
          <KeystoreGenerateView
            onGenerate={handleGenerate}
            isResetFlow={keyExists}
            isLoading={isLoading}
          />
        );
      default:
        return null;
    }
  };

  return (
    <div className="p-4 w-80">
      {renderContent()}
      {error && (
        <p className="mt-4 text-sm font-medium text-destructive text-center">
          {error}
        </p>
      )}
    </div>
  );
}
