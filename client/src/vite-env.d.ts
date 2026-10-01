/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_URL?: string;
  readonly VITE_GOOGLE_CLIENT_ID?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

interface GoogleIdentityCredentialResponse {
  credential: string;
}

interface GoogleIdentityButtonConfiguration {
  type: 'standard';
  theme?: 'outline' | 'filled_blue' | 'filled_black';
  size?: 'large' | 'medium' | 'small';
  text?: 'signin_with' | 'signup_with' | 'continue_with' | 'signin';
  shape?: 'rectangular' | 'pill' | 'circle' | 'square';
  width?: string;
}

interface GoogleIdentity {
  accounts: {
    id: {
      initialize(configuration: {
        client_id: string;
        callback: (response: GoogleIdentityCredentialResponse) => void;
        hd?: string;
        auto_select?: boolean;
      }): void;
      renderButton(element: HTMLElement, configuration: GoogleIdentityButtonConfiguration): void;
      disableAutoSelect(): void;
    };
  };
}

interface Window {
  google?: GoogleIdentity;
}