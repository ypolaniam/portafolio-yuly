import { useEffect, useState } from "react";

interface SnackbarProps {
  open: boolean;
  message: string;
  type: "success" | "error";
  onClose: () => void;
}

export default function Snackbar({ open, message, type, onClose }: SnackbarProps) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!open) return;
    setVisible(true);
    const timer = setTimeout(() => {
      setVisible(false);
      setTimeout(onClose, 300);
    }, 4000);
    return () => clearTimeout(timer);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className={`admin-snackbar ${visible ? "admin-snackbar-visible" : ""} admin-snackbar-${type}`}>
      <span>{message}</span>
      <button
        type="button"
        onClick={() => {
          setVisible(false);
          setTimeout(onClose, 300);
        }}
      >
        ×
      </button>
    </div>
  );
}
