'use client';

import { useEffect, useRef } from 'react';

interface GoogleLoginProps {
    onSuccess: (token: string) => void;
    onError: () => void;
}

export default function GoogleLogin({ onSuccess, onError }: GoogleLoginProps) {
    const googleButtonRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        // 1. Load the Google SDK script dynamically
        const script = document.createElement('script');
        script.src = 'https://accounts.google.com/gsi/client';
        script.async = true;
        script.defer = true;
        document.head.appendChild(script);

        script.onload = () => {
            // 2. Initialize Google Identity Services
            window.google?.accounts.id.initialize({
                client_id: '91716845059-1l96nahbcu7nb39k1sa9r4ev8p2nitdu.apps.googleusercontent.com', // Replace with your real Client ID
                callback: (response: any) => {
                    // This callback receives the Google ID Token (signed JWT)
                    if (response.credential) {
                        onSuccess(response.credential);
                    } else {
                        onError();
                    }
                },
            });

            // 3. Render the official pre-styled button inside the div
            if (googleButtonRef.current) {
                window.google?.accounts.id.renderButton(googleButtonRef.current, {
                    theme: 'outline',
                    size: 'large',
                    text: 'continue_with',
                    shape: 'rectangular',
                    width: 320,
                });
            }
        };

        return () => {
            document.head.removeChild(script);
        };
    }, [onSuccess, onError]);

    return <div ref={googleButtonRef} className="w-full flex justify-center" />;
}

// Add TypeScript support for the window object
declare global {
    interface Window {
        google?: any;
    }
}
