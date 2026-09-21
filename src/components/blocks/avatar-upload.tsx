import { useEffect, useRef, useState, useTransition } from "react";
import { Camera, Loader2, X } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";

interface AvatarUploadProps {
  currentAvatarUrl: string | null;
  fallback: string;
  onUpload: (file: File) => Promise<{ url?: string; error?: string }>;
  onRemove: () => Promise<{ error?: string }>;
  accept?: string;
}

export function AvatarUpload({
  currentAvatarUrl,
  fallback,
  onUpload,
  onRemove,
  accept = "image/jpeg,image/png,image/gif,image/webp",
}: AvatarUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<string | null>(currentAvatarUrl);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setPreview(currentAvatarUrl);
  }, [currentAvatarUrl]);

  function handleClick() {
    inputRef.current?.click();
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setError(null);

    startTransition(async () => {
      const result = await onUpload(file);
      if (result.error) {
        setError(result.error);
      } else if (result.url) {
        setPreview(result.url);
      }
    });

    e.target.value = "";
  }

  function handleRemove() {
    setError(null);
    startTransition(async () => {
      const result = await onRemove();
      if (result.error) {
        setError(result.error);
      } else {
        setPreview(null);
      }
    });
  }

  return (
    <div className="flex items-center gap-4">
      <button
        type="button"
        onClick={handleClick}
        disabled={isPending}
        className="group relative rounded-full cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
      >
        <Avatar key={preview ?? "no-avatar"} className="size-16">
          {preview && <AvatarImage src={preview} alt="Avatar" />}
          <AvatarFallback className="text-lg">{fallback}</AvatarFallback>
        </Avatar>

        <div className="absolute inset-0 flex items-center justify-center rounded-full bg-black/50 opacity-0 transition-opacity group-hover:opacity-100">
          {isPending ? (
            <Loader2 className="h-4 w-4 animate-spin text-white" />
          ) : (
            <Camera className="h-4 w-4 text-white" />
          )}
        </div>
      </button>

      <input
        ref={inputRef}
        type="file"
        accept={accept}
        onChange={handleFileChange}
        className="hidden"
      />

      <div className="flex flex-col gap-1">
        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="default"
            size="sm"
            onClick={handleClick}
            disabled={isPending}
          >
            {isPending ? "Uploading..." : "Change avatar"}
          </Button>
          {preview && (
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={handleRemove}
              disabled={isPending}
            >
              <X className="mr-1 h-3 w-3" />
              Remove
            </Button>
          )}
        </div>
        {error && <p className="text-xs text-destructive">{error}</p>}
      </div>
    </div>
  );
}
