import { ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";

interface PageHeaderProps {
  title: string;
  onBack?: () => void;
  rightAction?: React.ReactNode;
}

const PageHeader = ({ title, onBack, rightAction }: PageHeaderProps) => {
  const navigate = useNavigate();

  return (
    <div className="flex items-center justify-between py-4">
      <button onClick={onBack || (() => navigate(-1))} className="p-1">
        <ArrowLeft className="w-5 h-5 text-foreground" />
      </button>
      <h1 className="text-base font-semibold text-foreground">{title}</h1>
      <div className="w-8">{rightAction}</div>
    </div>
  );
};

export default PageHeader;
