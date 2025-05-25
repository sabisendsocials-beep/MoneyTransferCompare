import { useState, useEffect } from "react";

export const useNewsletterPopup = () => {
  const [showPopup, setShowPopup] = useState(false);
  const [hasShown, setHasShown] = useState(false);

  useEffect(() => {
    // Don't show if already shown in this session
    if (hasShown) return;

    // Check if user has already subscribed (stored in localStorage)
    const hasSubscribed = localStorage.getItem("newsletter_subscribed");
    if (hasSubscribed) return;

    let timeOnSite = 0;
    let hasEngaged = false;

    // Track time on site
    const timer = setInterval(() => {
      timeOnSite += 1000;
    }, 1000);

    // Track user engagement (scrolling, clicking, etc.)
    const trackEngagement = () => {
      hasEngaged = true;
    };

    // Add engagement listeners
    window.addEventListener("scroll", trackEngagement);
    window.addEventListener("click", trackEngagement);
    window.addEventListener("keydown", trackEngagement);

    // Smart timing logic
    const checkShouldShow = () => {
      // Show after 45 seconds if user has engaged
      if (timeOnSite >= 45000 && hasEngaged) {
        setShowPopup(true);
        setHasShown(true);
        cleanup();
      }
      // Show after 90 seconds regardless
      else if (timeOnSite >= 90000) {
        setShowPopup(true);
        setHasShown(true);
        cleanup();
      }
    };

    const popupTimer = setInterval(checkShouldShow, 5000);

    const cleanup = () => {
      clearInterval(timer);
      clearInterval(popupTimer);
      window.removeEventListener("scroll", trackEngagement);
      window.removeEventListener("click", trackEngagement);
      window.removeEventListener("keydown", trackEngagement);
    };

    // Exit intent detection
    const handleMouseLeave = (e: MouseEvent) => {
      if (e.clientY <= 0 && !hasShown) {
        setShowPopup(true);
        setHasShown(true);
        cleanup();
      }
    };

    document.addEventListener("mouseleave", handleMouseLeave);

    return () => {
      cleanup();
      document.removeEventListener("mouseleave", handleMouseLeave);
    };
  }, [hasShown]);

  const closePopup = () => {
    setShowPopup(false);
  };

  const markAsSubscribed = () => {
    localStorage.setItem("newsletter_subscribed", "true");
    setShowPopup(false);
  };

  return {
    showPopup,
    closePopup,
    markAsSubscribed,
  };
};