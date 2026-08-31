import {
  Plus,
  MessageCircle,
  Check,
  CheckSquare,
  ArrowLeft,
  Megaphone,
  Users,
  Search,
  Settings,
  LogOut,
  AlertTriangle,
  Bell,
  User,
  Phone,
  Eye,
  EyeOff,
  Trash2,
  Edit2,
  Calendar,
  Clock,
  Send,
  ExternalLink,
  ChevronRight,
  Shield,
  Layers,
  Heart,
  Home,
  FileText,
  Download,
  FileSpreadsheet,
} from 'lucide-react';

export function IconoDescargar({ className, size = 18 }: { className?: string; size?: number }) {
  return <Download size={size} className={className} />;
}

export function IconoExcel({ className, size = 18 }: { className?: string; size?: number }) {
  return <FileSpreadsheet size={size} className={className} />;
}

export function IconoMas({ className, size = 18 }: { className?: string; size?: number }) {
  return <Plus size={size} className={className} />;
}

export function IconoWhatsApp({ className, size = 18 }: { className?: string; size?: number }) {
  return <MessageCircle size={size} className={className} />;
}

export function IconoCheck({ className, size = 18 }: { className?: string; size?: number }) {
  return <Check size={size} className={className} />;
}

export function IconoTareas({ className, size = 18 }: { className?: string; size?: number }) {
  return <CheckSquare size={size} className={className} />;
}

export function IconoAtras({ className, size = 18 }: { className?: string; size?: number }) {
  return <ArrowLeft size={size} className={className} />;
}

export function IconoDifundir({ className, size = 18 }: { className?: string; size?: number }) {
  return <Megaphone size={size} className={className} />;
}

export function IconoEquipo({ className, size = 18 }: { className?: string; size?: number }) {
  return <Users size={size} className={className} />;
}

export function IconoBuscar({ className, size = 18 }: { className?: string; size?: number }) {
  return <Search size={size} className={className} />;
}

export function IconoAjustes({ className, size = 18 }: { className?: string; size?: number }) {
  return <Settings size={size} className={className} />;
}

export function IconoSalir({ className, size = 18 }: { className?: string; size?: number }) {
  return <LogOut size={size} className={className} />;
}

export function IconoAlerta({ className, size = 18 }: { className?: string; size?: number }) {
  return <AlertTriangle size={size} className={className} />;
}

export function IconoCampana({ className, size = 18 }: { className?: string; size?: number }) {
  return <Bell size={size} className={className} />;
}

export function IconoUsuario({ className, size = 18 }: { className?: string; size?: number }) {
  return <User size={size} className={className} />;
}

export function IconoTelefono({ className, size = 18 }: { className?: string; size?: number }) {
  return <Phone size={size} className={className} />;
}

export function IconoOjo({ className, size = 18 }: { className?: string; size?: number }) {
  return <Eye size={size} className={className} />;
}

export function IconoOjoCerrado({ className, size = 18 }: { className?: string; size?: number }) {
  return <EyeOff size={size} className={className} />;
}

export function IconoPapelera({ className, size = 18 }: { className?: string; size?: number }) {
  return <Trash2 size={size} className={className} />;
}

export function IconoEditar({ className, size = 18 }: { className?: string; size?: number }) {
  return <Edit2 size={size} className={className} />;
}

export function IconoCalendario({ className, size = 18 }: { className?: string; size?: number }) {
  return <Calendar size={size} className={className} />;
}

export function IconoReloj({ className, size = 18 }: { className?: string; size?: number }) {
  return <Clock size={size} className={className} />;
}

export function IconoEnviar({ className, size = 18 }: { className?: string; size?: number }) {
  return <Send size={size} className={className} />;
}

export function IconoEnlace({ className, size = 18 }: { className?: string; size?: number }) {
  return <ExternalLink size={size} className={className} />;
}

export function IconoFlecha({ className, size = 18 }: { className?: string; size?: number }) {
  return <ChevronRight size={size} className={className} />;
}

export function IconoEscudo({ className, size = 18 }: { className?: string; size?: number }) {
  return <Shield size={size} className={className} />;
}

export function IconoCapas({ className, size = 18 }: { className?: string; size?: number }) {
  return <Layers size={size} className={className} />;
}

export function IconoCorazon({ className, size = 18 }: { className?: string; size?: number }) {
  return <Heart size={size} className={className} />;
}

export function IconoInicio({ className, size = 18 }: { className?: string; size?: number }) {
  return <Home size={size} className={className} />;
}

export function IconoDocumento({ className, size = 18 }: { className?: string; size?: number }) {
  return <FileText size={size} className={className} />;
}
