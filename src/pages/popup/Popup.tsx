import React from "react";
import "@pages/popup/Popup.css";
import withSuspense from "@src/shared/hoc/withSuspense";
import { useState } from "react";
import { useEffect } from "react";

const Popup = () => {

  const [url, setUrl] = useState<string>();
  const [hasVideo, setHasVideo] = useState<boolean>();

  const [isTiming, setIsTiming] = useState<boolean>(false);

  useEffect(() => {

    chrome.tabs.query({ active: true, currentWindow: true }, tabs => {
      const activeTab = tabs.find(tab => tab.active)
      chrome.tabs.sendMessage(
        activeTab?.id,
        { message: "popupOpen" },
        ({ url, hasVideo, isEnabled }) => { setIsTiming(isEnabled); setUrl(url); setHasVideo(hasVideo) }
      )
    })

  }, [])

  const startTiming = () => {
    chrome.tabs.query({ active: true, currentWindow: true }, tabs => {
      const activeTab = tabs.find(tab => tab.active)
      chrome.tabs.sendMessage(
        activeTab?.id,
        { message: "startTiming" }
      )
      setIsTiming(true);
      window.close();
    })
  }

  return (
    <div className="App text-white">

      {!isTiming && !hasVideo && <p>No video on this page detected. Please refresh if this is a mistake.</p>}

      {!isTiming && hasVideo && <button onClick={startTiming} className="rounded-[16px] bg-red-600 py-[8px] px-[16px] font-[16px] uppercase font-bold border border-red-300">Start</button>}
      
      {isTiming && <p>Timing is currently going on</p>}

    </div>
  );
};

export default withSuspense(Popup);
