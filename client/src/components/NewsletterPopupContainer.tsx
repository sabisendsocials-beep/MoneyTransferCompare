import { NewsletterPopup } from "./NewsletterPopup";
import { useNewsletterPopup } from "@/hooks/useNewsletterPopup";

export const NewsletterPopupContainer = () => {
  const { showPopup, closePopup } = useNewsletterPopup();

  return <NewsletterPopup isOpen={showPopup} onClose={closePopup} />;
};