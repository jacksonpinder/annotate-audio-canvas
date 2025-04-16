
import { AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface ErrorMessageProps {
  title: string;
  message: string;
  retry?: () => void;
}

export default function ErrorMessage({ title, message, retry }: ErrorMessageProps) {
  return (
    <div className="bg-destructive/10 border border-destructive/20 rounded-md p-4 flex flex-col items-center justify-center text-center">
      <AlertCircle className="h-10 w-10 text-destructive mb-2" />
      <h3 className="font-semibold text-destructive mb-1">{title}</h3>
      <p className="text-sm text-muted-foreground mb-3">{message}</p>
      {retry && (
        <Button variant="outline" size="sm" onClick={retry}>
          Try Again
        </Button>
      )}
    </div>
  );
}
