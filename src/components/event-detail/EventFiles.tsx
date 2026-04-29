import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  Upload, 
  Download, 
  Trash2, 
  HardDrive, 
  RefreshCw,
  FileText,
  ExternalLink,
  Loader2
} from "lucide-react";
import { toast } from "sonner";
import { Event } from "@/hooks/useEvents";
import { useEventFiles, useUploadEventFile, useDeleteEventFile } from "@/hooks/useEventFiles";

interface EventFilesProps {
  event: Event;
}

declare global {
  namespace JSX {
    interface IntrinsicElements {
      'div': React.DetailedHTMLProps<React.HTMLAttributes<HTMLDivElement> & { 
        'data-src'?: string; 
        'data-filename'?: string; 
        'data-sitename'?: string;
      }, HTMLDivElement>;
    }
  }
}

const SaveToDriveButton = ({ url, filename }: { url: string; filename: string }) => {
  return (
    <div 
      className="g-savetodrive"
      data-src={url}
      data-filename={filename}
      data-sitename="Nexus Event Management"
    ></div>
  );
};

const EventFiles = ({ event }: EventFilesProps) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { data: storageFiles, isLoading } = useEventFiles(event.id);
  const uploadFile = useUploadEventFile();
  const deleteFile = useDeleteEventFile();

  // Combine storage files with simulated branding assets
  const files = [
    ...(event.background_image_url ? [{
      id: "bg-main",
      name: "Event Background",
      url: event.background_image_url,
      type: "image",
      size: "1.2 MB",
      category: "Branding"
    }] : []),
    ...(storageFiles || []).map(f => ({
      id: f.id,
      name: f.name,
      url: f.url,
      type: f.name.split('.').pop()?.toLowerCase() === 'csv' ? 'csv' : 'image',
      size: f.metadata ? `${(f.metadata.size / 1024 / 1024).toFixed(2)} MB` : "Unknown",
      category: "Uploads"
    }))
  ];

  // Manually trigger Google Drive buttons to render
  useEffect(() => {
    const timer = setTimeout(() => {
      // @ts-ignore
      if (window.gapi && window.gapi.savetodrive) {
        // @ts-ignore
        window.gapi.savetodrive.go();
      }
    }, 1000);
    return () => clearTimeout(timer);
  }, [files.length]);

  const handleSyncToDrive = () => {
    toast.info("Direct Google Drive integration is active! You can now save individual files to your Drive using the icons on each file card below.", {
      duration: 5000,
      icon: <HardDrive className="w-4 h-4" />
    });
  };

  const handleUploadClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      await uploadFile.mutateAsync({ eventId: event.id, file });
      toast.success(`Successfully uploaded ${file.name}`);
    } catch (err: any) {
      toast.error(err.message || "Upload failed");
    }
  };

  const handleDeleteFile = async (fileName: string) => {
    if (!confirm("Are you sure you want to delete this file?")) return;
    try {
      await deleteFile.mutateAsync({ eventId: event.id, fileName });
      toast.success("File deleted");
    } catch (err: any) {
      toast.error("Delete failed");
    }
  };

  const handleDownload = (url: string | null) => {
    if (!url) return;
    window.open(url, '_blank');
  };

  return (
    <div className="space-y-6">
      <input 
        type="file" 
        ref={fileInputRef} 
        className="hidden" 
        onChange={handleFileChange}
        accept="image/*,application/pdf,.csv"
      />

      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-display font-semibold">Event Assets</h3>
          <p className="text-sm text-muted-foreground">Manage files and cloud backups.</p>
        </div>
        <Button 
          variant="outline" 
          size="sm" 
          className="rounded-full bg-primary/10 text-primary border-primary/20 hover:bg-primary/20"
          onClick={handleSyncToDrive}
        >
          <HardDrive className="w-4 h-4 mr-2" />
          Sync to Google Drive
        </Button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {/* Upload Slot */}
        <div 
          className="border-2 border-dashed border-muted rounded-2xl p-6 flex flex-col items-center justify-center text-center space-y-3 hover:border-primary/50 transition-colors cursor-pointer group"
          onClick={handleUploadClick}
        >
          <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center group-hover:bg-primary/10 group-hover:text-primary transition-colors">
            {uploadFile.isPending ? <Loader2 className="w-5 h-5 animate-spin" /> : <Upload className="w-5 h-5" />}
          </div>
          <div>
            <p className="text-sm font-medium">{uploadFile.isPending ? "Uploading..." : "Upload new asset"}</p>
            <p className="text-xs text-muted-foreground">PDF, JPG, PNG (Max 10MB)</p>
          </div>
        </div>

        {/* Loading State */}
        {isLoading && (
          <div className="col-span-full flex items-center justify-center py-10">
            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
          </div>
        )}

        {/* File Cards */}
        {files.map((file) => (
          <Card key={file.id} className="rounded-2xl border-border hover:shadow-md transition-shadow overflow-hidden bg-card">
            <CardContent className="p-0">
              <div className="aspect-video bg-muted flex items-center justify-center relative group">
                {file.type === "image" && file.url ? (
                  <img src={file.url} alt={file.name} className="w-full h-full object-cover" />
                ) : (
                  <FileText className="w-10 h-10 text-muted-foreground/30" />
                )}
                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                  <Button size="icon" variant="secondary" className="h-8 w-8 rounded-full" onClick={() => handleDownload(file.url)}>
                    <Download className="w-4 h-4" />
                  </Button>
                  {file.url && (
                    <div className="h-8 flex items-center justify-center bg-white rounded-full px-1 shadow-sm">
                      <SaveToDriveButton url={file.url} filename={file.name} />
                    </div>
                  )}
                  {file.category === "Uploads" && (
                    <Button size="icon" variant="destructive" className="h-8 w-8 rounded-full" onClick={() => handleDeleteFile(file.name)}>
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  )}
                </div>
              </div>
              <div className="p-4">
                <div className="flex items-center justify-between mb-1">
                  <h4 className="text-sm font-semibold truncate">{file.name}</h4>
                  <Badge variant="outline" className="text-[10px] uppercase font-bold">{file.category}</Badge>
                </div>
                <div className="flex items-center text-xs text-muted-foreground">
                  <span>{file.type.toUpperCase()}</span>
                  <span className="mx-2">•</span>
                  <span>{file.size}</span>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="bg-muted/30 rounded-2xl p-6 border border-border/50">
        <div className="flex gap-4">
          <div className="w-12 h-12 rounded-xl bg-card flex items-center justify-center shrink-0 shadow-sm">
            <HardDrive className="w-6 h-6 text-primary" />
          </div>
          <div className="space-y-1">
            <h4 className="font-semibold text-sm">Google Drive Mirroring</h4>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Files saved here are securely hosted in your Nexus Cloud. Use the Google Drive icon on any file card to officially archive it in your Drive.
            </p>
            <Button variant="link" className="h-auto p-0 text-xs text-primary" asChild>
              <a 
                href={`https://drive.google.com/drive/search?q=${encodeURIComponent(event.name)}`} 
                target="_blank" 
                rel="noopener noreferrer"
              >
                View in Google Drive <ExternalLink className="w-3 h-3 ml-1" />
              </a>
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EventFiles;
 
 
