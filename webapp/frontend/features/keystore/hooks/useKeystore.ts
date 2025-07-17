import { useContext } from "react";
import { KeystoreContext } from "../components/KeystoreProvider";

export function useKeystore() {
  const context = useContext(KeystoreContext);
  if (!context) {
    throw new Error("useKeystore must be used within a KeystoreProvider");
  }
  return context;
}
