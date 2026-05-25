import { useCallback, useEffect, useMemo, useState } from "react";
import Cropper, { type Area } from "react-easy-crop";
import { Loader2, RotateCcw, Check, X, AlertTriangle, ZoomIn } from "lucide-react";

type Props = {
  file: File;
  onCancel: () => void;
  /** Recebe um Blob JPEG já recortado/comprimido (proporção 16:9). */
  onConfirm: (blob: Blob) => void;
};

const ASPECT = 16 / 9;
const OUTPUT_WIDTH = 1600; // 1600x900 final
const OUTPUT_HEIGHT = 900;
const MIN_RECOMMENDED_WIDTH = 800;

export function BannerCropper({ file, onCancel, onConfirm }: Props) {
  const url = useMemo(() => URL.createObjectURL(file), [file]);
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [areaPx, setAreaPx] = useState<Area | null>(null);
  const [imgSize, setImgSize] = useState<{ w: number; h: number } | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const img = new Image();
    img.onload = () => setImgSize({ w: img.naturalWidth, h: img.naturalHeight });
    img.src = url;
    return () => URL.revokeObjectURL(url);
  }, [url]);

  const onCropComplete = useCallback((_: Area, pixels: Area) => {
    setAreaPx(pixels);
  }, []);

  const tooSmall = imgSize ? imgSize.w < MIN_RECOMMENDED_WIDTH : false;

  async function handleConfirm() {
    if (!areaPx) return;
    setSaving(true);
    try {
      const blob = await renderCroppedImage(url, areaPx);
      onConfirm(blob);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-[100] bg-black/95 flex flex-col"
      style={{
        paddingTop: "env(safe-area-inset-top)",
        paddingBottom: "env(safe-area-inset-bottom)",
      }}
      role="dialog"
      aria-modal="true"
      aria-label="Ajustar capa"
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 h-14 shrink-0 text-white">
        <button
          type="button"
          onClick={onCancel}
          className="h-10 w-10 -ml-2 rounded-full hover:bg-white/10 flex items-center justify-center"
          aria-label="Cancelar"
        >
          <X className="h-5 w-5" />
        </button>
        <span className="text-sm font-semibold">Ajustar capa</span>
        <button
          type="button"
          onClick={handleConfirm}
          disabled={saving || !areaPx}
          className="h-10 px-4 rounded-full bg-primary text-primary-foreground font-bold text-sm flex items-center gap-1.5 disabled:opacity-50"
        >
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
          Salvar
        </button>
      </div>

      {/* Cropper area */}
      <div className="relative flex-1 min-h-0 bg-black">
        <Cropper
          image={url}
          crop={crop}
          zoom={zoom}
          minZoom={1}
          maxZoom={4}
          aspect={ASPECT}
          showGrid
          restrictPosition
          objectFit="contain"
          onCropChange={setCrop}
          onZoomChange={setZoom}
          onCropComplete={onCropComplete}
        />
        {/* Indicador de área segura sobreposto ao crop */}
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
          <div className="w-[78%] aspect-[16/9] border border-dashed border-white/60 rounded-md" />
        </div>
      </div>

      {/* Controls */}
      <div className="shrink-0 px-4 pt-3 pb-4 bg-black/80 backdrop-blur text-white space-y-3">
        {tooSmall && (
          <div className="flex items-start gap-2 text-[11px] text-yellow-300 bg-yellow-500/10 border border-yellow-500/30 rounded-lg px-2.5 py-1.5">
            <AlertTriangle className="h-3.5 w-3.5 mt-0.5 shrink-0" />
            Imagem pequena ({imgSize?.w}×{imgSize?.h}px). Recomendado: 1600×900px ou maior.
          </div>
        )}
        <div className="flex items-center gap-3">
          <ZoomIn className="h-4 w-4 opacity-80 shrink-0" />
          <input
            type="range"
            min={1}
            max={4}
            step={0.01}
            value={zoom}
            onChange={(e) => setZoom(Number(e.target.value))}
            className="flex-1 accent-primary"
            aria-label="Zoom"
          />
          <button
            type="button"
            onClick={() => { setZoom(1); setCrop({ x: 0, y: 0 }); }}
            className="h-10 w-10 rounded-full hover:bg-white/10 flex items-center justify-center"
            aria-label="Restaurar"
          >
            <RotateCcw className="h-4 w-4" />
          </button>
        </div>
        <p className="text-[11px] text-white/70 text-center leading-tight">
          Arraste para mover • Pinça/slider para zoom • Tudo dentro do retângulo aparece na capa
        </p>
      </div>
    </div>
  );
}

/** Recorta e comprime a imagem em JPEG 1600x900. */
async function renderCroppedImage(url: string, area: Area): Promise<Blob> {
  const img = await loadImage(url);
  const canvas = document.createElement("canvas");
  canvas.width = OUTPUT_WIDTH;
  canvas.height = OUTPUT_HEIGHT;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas 2D não disponível");
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(
    img,
    area.x,
    area.y,
    area.width,
    area.height,
    0,
    0,
    OUTPUT_WIDTH,
    OUTPUT_HEIGHT,
  );
  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (b) => (b ? resolve(b) : reject(new Error("Falha ao gerar imagem"))),
      "image/jpeg",
      0.85,
    );
  });
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    // Só define crossOrigin para URLs http(s). Para blob:/data: alguns
    // Androids rejeitam o onload silenciosamente quando crossOrigin está setado.
    if (/^https?:/i.test(src)) img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("Falha ao carregar imagem"));
    img.src = src;
  });
}
