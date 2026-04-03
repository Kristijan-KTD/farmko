import { Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { useNavigate } from "react-router-dom";

interface UpgradeModalProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  description?: string;
}

const UpgradeModal = ({ open, onClose, title, description }: UpgradeModalProps) => {
  const navigate = useNavigate();

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <div className="mx-auto w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center mb-2">
            <Zap className="w-7 h-7 text-primary" />
          </div>
          <DialogTitle className="text-center">
            {title || "You've reached your monthly listing limit"}
          </DialogTitle>
          <DialogDescription className="text-center">
            {description || "Upgrade your plan to post more listings each month and reach more customers."}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3 pt-2">
          <Button
            onClick={() => { onClose(); navigate("/plans"); }}
            className="w-full rounded-full h-11 font-semibold"
          >
            View Plans
          </Button>
          <Button
            variant="outline"
            onClick={onClose}
            className="w-full rounded-full h-11 font-semibold"
          >
            Maybe Later
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default UpgradeModal;
