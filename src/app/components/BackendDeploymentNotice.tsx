import { AlertTriangle, ExternalLink, CheckCircle2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';

/**
 * Backend Deployment Notice
 * 
 * Shows a warning if the Supabase Edge Function is not deployed yet.
 * Provides quick deployment instructions and status check.
 */
export default function BackendDeploymentNotice() {
  const [isDeployed, setIsDeployed] = useState<boolean | null>(null);
  const [checking, setChecking] = useState(false);

  const checkBackendStatus = async () => {
    setChecking(true);
    try {
      // Try to call the health endpoint
      const { data, error } = await supabase.functions.invoke('server/health', {
        method: 'GET',
      });

      if (!error && data?.status === 'ok') {
        setIsDeployed(true);
      } else {
        setIsDeployed(false);
      }
    } catch (err) {
      setIsDeployed(false);
    } finally {
      setChecking(false);
    }
  };

  useEffect(() => {
    checkBackendStatus();
  }, []);

  // If deployed, don't show anything
  if (isDeployed === true) {
    return null;
  }

  // If still checking, show nothing (avoid flash)
  if (isDeployed === null) {
    return null;
  }

  return (
    <Card className="border-amber-200 bg-amber-50">
      <CardHeader>
        <div className="flex items-start gap-3">
          <AlertTriangle className="w-6 h-6 text-amber-600 flex-shrink-0 mt-1" />
          <div className="flex-1">
            <CardTitle className="text-lg text-amber-900">
              Backend Not Deployed
            </CardTitle>
            <CardDescription className="text-amber-700 mt-1">
              The Supabase Edge Function needs to be deployed before you can make live transfers.
            </CardDescription>
          </div>
          <Badge variant="outline" className="border-amber-300 text-amber-700 bg-white">
            Action Required
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="bg-white rounded-lg p-4 border border-amber-200">
          <h4 className="font-semibold text-gray-900 mb-2 flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-green-600" />
            Quick Deploy Steps:
          </h4>
          <ol className="space-y-2 text-sm text-gray-700 ml-6 list-decimal">
            <li>
              Install Supabase CLI:{' '}
              <code className="bg-gray-100 px-2 py-1 rounded text-xs">
                npm install -g supabase
              </code>
            </li>
            <li>
              Login:{' '}
              <code className="bg-gray-100 px-2 py-1 rounded text-xs">
                supabase login
              </code>
            </li>
            <li>
              Link project:{' '}
              <code className="bg-gray-100 px-2 py-1 rounded text-xs">
                supabase link --project-ref ulolufsmjdlramdtstrr
              </code>
            </li>
            <li>
              Deploy function:{' '}
              <code className="bg-gray-100 px-2 py-1 rounded text-xs">
                supabase functions deploy server
              </code>
            </li>
          </ol>
        </div>

        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={checkBackendStatus}
            disabled={checking}
          >
            {checking ? 'Checking...' : 'Check Status'}
          </Button>
          <Button
            variant="outline"
            size="sm"
            asChild
          >
            <a
              href="https://github.com/yourusername/border-app/blob/main/DEPLOY_BACKEND.md"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1"
            >
              Full Guide
              <ExternalLink className="w-3 h-3" />
            </a>
          </Button>
        </div>

        <div className="text-xs text-amber-700 bg-amber-100 rounded p-2">
          <strong>Note:</strong> Bank verification and account search work without backend deployment.
          Only live transfers require the backend to be deployed.
        </div>
      </CardContent>
    </Card>
  );
}
