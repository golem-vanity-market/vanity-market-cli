import React, {
  createContext,
  useRef,
  useState,
  useEffect,
  useCallback,
} from "react";

const KEYSTORE_ORIGIN = process.env.NEXT_PUBLIC_KEYSTORE_ORIGIN;
if (!KEYSTORE_ORIGIN) {
  throw new Error(
    "CRITICAL: NEXT_PUBLIC_KEYSTORE_ORIGIN is not set in your environment variables."
  );
}

type Action = {
  checkForExistingKey: {
    payload: undefined;
    response: {
      keyExists: boolean;
    };
  };
  unlockAndGetPublicKey: {
    payload: {
      passphrase: string;
    };
    response: {
      publicKey: string;
    };
  };
  generateInitialKey: {
    payload: {
      passphrase: string;
    };
    response: {
      publicKey: string;
    };
  };
  deriveAndDownload: {
    payload: {
      salt: string;
      passphrase: string;
      downloadPassword: string;
    };
    response: undefined;
  };
};

type ActionResponse =
  | {
      status: "success";
      payload: Action[keyof Action]["response"];
      messageId: string;
    }
  | {
      status: "error";
      payload: {
        message: string;
      };
      messageId: string;
    };

type KeyframeContext = {
  isReady: boolean;
  sendMessage: <T extends keyof Action>(
    action: T,
    payload: Action[T]["payload"]
  ) => Promise<Action[T]["response"]>;
};

export const KeystoreContext = createContext<KeyframeContext>({
  isReady: false,
  sendMessage: () => {
    throw new Error("Not initialized");
  },
});

export function KeystoreProvider({ children }: { children: React.ReactNode }) {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [isReady, setIsReady] = useState(false);
  const pendingRequests = useRef(new Map());

  const sendMessage = useCallback(
    async <T extends keyof Action>(
      action: T,
      payload: Action[T]["payload"]
    ) => {
      if (!isReady || !iframeRef.current?.contentWindow || !KEYSTORE_ORIGIN) {
        throw new Error("Iframe not ready");
      }
      const { promise, resolve, reject } =
        Promise.withResolvers<Action[T]["response"]>();

      // Generate a unique ID for this request
      const messageId = crypto.randomUUID();
      pendingRequests.current.set(messageId, { resolve, reject, action });
      iframeRef.current.contentWindow.postMessage(
        { action, payload, messageId },
        KEYSTORE_ORIGIN
      );
      return promise;
    },
    [isReady]
  );

  useEffect(() => {
    const handleMessage = (event: MessageEvent<ActionResponse>) => {
      if (event.origin !== KEYSTORE_ORIGIN) {
        return;
      }

      const { status, payload, messageId } = event.data;

      // Find the corresponding pending request
      const request = pendingRequests.current.get(messageId);

      if (request) {
        if (status === "success") {
          request.resolve(payload);
        } else {
          const error = new Error(
            payload.message ||
              "An unknown error occurred in the keystore iframe."
          );
          request.reject(error);
        }
        // Clean up the completed request
        pendingRequests.current.delete(messageId);
      }
    };

    window.addEventListener("message", handleMessage);

    return () => {
      window.removeEventListener("message", handleMessage);
    };
  }, []);

  const value = { isReady, sendMessage };

  return (
    <KeystoreContext.Provider value={value}>
      <iframe
        ref={iframeRef}
        src={KEYSTORE_ORIGIN}
        title="Secure Keystore"
        style={{ display: "none" }}
        onLoad={() => {
          setIsReady(true);
        }}
        sandbox="allow-scripts allow-downloads allow-same-origin"
      />
      {children}
    </KeystoreContext.Provider>
  );
}
