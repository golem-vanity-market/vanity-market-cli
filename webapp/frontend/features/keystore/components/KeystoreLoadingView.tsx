import { Loader } from "lucide-react";

export function KeystoreLoadingView() {
  return (
    <div className="flex items-center justify-center p-8">
      <Loader className="mr-2 h-4 w-4 animate-spin" />
      <span>Checking Keystore...</span>
    </div>
  );
}
