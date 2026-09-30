// The app's icons, from Lucide (lucide-react). Each takes a className for
// sizing/colour and defaults to h-5 w-5, so callers stay unchanged.
import {
  ArrowLeft,
  Camera,
  Image,
  Link,
  LogOut,
  Pencil,
  Plus,
  RotateCcw,
  Trash2,
  X,
  type LucideIcon,
} from "lucide-react";

type P = { className?: string };
const icon = (Icon: LucideIcon) =>
  function AppIcon({ className = "h-5 w-5" }: P) {
    return <Icon className={className} aria-hidden />;
  };

export const PlusIcon = icon(Plus);
export const TrashIcon = icon(Trash2);
export const BackIcon = icon(ArrowLeft);
export const EditIcon = icon(Pencil);
export const LinkIcon = icon(Link);
export const PhotoIcon = icon(Image);
export const CameraIcon = icon(Camera);
export const RestoreIcon = icon(RotateCcw);
export const XIcon = icon(X);
export const LogoutIcon = icon(LogOut);
