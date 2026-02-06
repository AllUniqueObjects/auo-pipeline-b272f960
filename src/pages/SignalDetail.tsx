import { useParams } from 'react-router-dom';
import { Header } from '@/components/Header';
import { ArrowLeft } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';

export default function SignalDetail() {
  const { id } = useParams();

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1">
        <div className="content-wrapper py-6">
          <Button variant="ghost" size="sm" asChild className="mb-6 -ml-2">
            <Link to="/signals">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to signals
            </Link>
          </Button>
          
          <div className="text-center py-12">
            <p className="text-muted-foreground text-sm">
              Signal #{id} — Detail view coming soon.
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}
