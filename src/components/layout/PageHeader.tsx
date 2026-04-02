import { ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";

interface PageHeaderProps {
  title: React.ReactNode;
  onBack?: () => void;
  rightAction?: React.ReactNode;
}

const PageHeader = ({ title, onBack, rightAction }: PageHeaderProps) => {
  const navigate = useNavigate();

  return (
    <div className="flex items-center justify-between h-14 sticky top-0 z-30 bg-background">
      <button onClick={onBack || (() => navigate(-1))} className="w-8 h-8 flex items-center justify-center -ml-1">
        <ArrowLeft className="w-5 h-5 text-foreground" />
      </button>
      <h1 className="text-[15px] font-semibold text-foreground">{title}</h1>
      <div className="w-8 flex items-center justify-center">{rightAction}</div>
    </div>
  );
};

export default PageHeader;
