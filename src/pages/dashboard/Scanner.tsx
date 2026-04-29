import { useEffect, useState, useRef } from "react";
import { Html5QrcodeScanner } from "html5-qrcode";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useUpdateRegistration, useRegistrations } from "@/hooks/useRegistrations";
import { toast } from "sonner";
import { QrCode, User, CheckCircle2, XCircle, Loader2, RefreshCw } from "lucide-react";

const Scanner = () => {
  const [scannedId, setScannedId] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [lastResult, setLastResult] = useState<{ success: boolean; name?: string; message: string } | null>(null);
  const scannerRef = useRef<Html5QrcodeScanner | null>(null);
  
  const { data: registrations } = useRegistrations();
  const updateReg = useUpdateRegistration();

  useEffect(() => {
    // Initialize scanner
    const scanner = new Html5QrcodeScanner(
      "qr-reader",
      { 
        fps: 10, 
        qrbox: { width: 250, height: 250 },
        aspectRatio: 1.0,
      },
      /* verbose= */ false
    );

    scanner.render(onScanSuccess, onScanFailure);
    scannerRef.current = scanner;

    return () => {
      if (scannerRef.current) {
        scannerRef.current.clear().catch(console.error);
      }
    };
  }, []);

  const onScanSuccess = async (decodedText: string) => {
    if (isProcessing || decodedText === scannedId) return;
    
    setScannedId(decodedText);
    setIsProcessing(true);
    setLastResult(null);

    try {
      // Basic UUID validation
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      if (!uuidRegex.test(decodedText)) {
        throw new Error("Invalid ticket format");
      }

      // Find registration to get name
      const reg = registrations?.find(r => r.id === decodedText);
      const attendeeName = reg ? (reg.data as any)["Full Name"] || (reg.data as any)["Name"] || "Attendee" : "Attendee";

      await updateReg.mutateAsync({ id: decodedText, status: "checked_in" });
      
      setLastResult({ 
        success: true, 
        name: attendeeName,
        message: "Check-in successful!" 
      });
      toast.success(`Checked in: ${attendeeName}`);
    } catch (err: any) {
      setLastResult({ 
        success: false, 
        message: err.message || "Failed to process ticket" 
      });
      toast.error(err.message || "Invalid or already used ticket");
    } finally {
      setIsProcessing(false);
      // Reset scanned ID after a delay to allow scanning the same code again if needed
      setTimeout(() => setScannedId(null), 3000);
    }
  };

  const onScanFailure = (error: any) => {
    // We ignore failures as they happen constantly when no QR is in view
  };

  return (
    <div className="space-y-8 max-w-2xl mx-auto">
      <div>
        <h1 className="text-3xl font-display font-bold">Check-in Scanner</h1>
        <p className="text-muted-foreground">Scan attendee QR codes for instant entry.</p>
      </div>

      <div className="grid grid-cols-1 gap-6">
        {/* Scanner Window */}
        <Card className="overflow-hidden border-2 border-primary/20 shadow-xl">
          <CardContent className="p-0">
            <div id="qr-reader" className="w-full"></div>
          </CardContent>
        </Card>

        {/* Result Overlay / Feedback */}
        {(isProcessing || lastResult) && (
          <motion.div 
            initial={{ opacity: 0, y: 10 }} 
            animate={{ opacity: 1, y: 0 }}
            className={`p-6 rounded-2xl border-2 flex items-center gap-4 ${
              isProcessing 
                ? "bg-muted border-border" 
                : lastResult?.success 
                  ? "bg-success/10 border-success/50" 
                  : "bg-destructive/10 border-destructive/50"
            }`}
          >
            <div className={`w-12 h-12 rounded-full flex items-center justify-center shrink-0 ${
              isProcessing 
                ? "bg-background" 
                : lastResult?.success 
                  ? "bg-success text-white" 
                  : "bg-destructive text-white"
            }`}>
              {isProcessing ? (
                <Loader2 className="w-6 h-6 animate-spin text-primary" />
              ) : lastResult?.success ? (
                <CheckCircle2 className="w-6 h-6" />
              ) : (
                <XCircle className="w-6 h-6" />
              )}
            </div>
            <div className="flex-1 min-w-0">
              {isProcessing ? (
                <p className="font-semibold">Processing ticket...</p>
              ) : (
                <>
                  <p className="font-bold text-lg truncate">
                    {lastResult?.name || (lastResult?.success ? "Success" : "Error")}
                  </p>
                  <p className="text-sm opacity-80">{lastResult?.message}</p>
                </>
              )}
            </div>
            {!isProcessing && (
              <Button 
                variant="ghost" 
                size="icon" 
                onClick={() => setLastResult(null)}
                className="rounded-full"
              >
                <RefreshCw className="w-4 h-4" />
              </Button>
            )}
          </motion.div>
        )}

        {/* Instructions */}
        {!lastResult && !isProcessing && (
          <div className="text-center space-y-4 py-4">
            <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-primary/10 text-primary">
              <QrCode className="w-6 h-6" />
            </div>
            <div className="space-y-1">
              <h3 className="font-semibold">Ready to scan</h3>
              <p className="text-sm text-muted-foreground px-8">
                Position the attendee's QR code within the frame to automatically check them in.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

// Simple motion polyfill since framer-motion is already in project
import { motion } from "framer-motion";

export default Scanner;
