import { PauseIcon } from "@root/src/shared/svgs/PauseIcon";
import { PlayIcon } from "@root/src/shared/svgs/PlayIcon";
import { StepBackwardIcon } from "@root/src/shared/svgs/StepBackwardIcon";
import { StepForwardIcon } from "@root/src/shared/svgs/StepForwardIcon";
import { useEffect, useState } from "react";

type RunData = {
  start?: number
  end?: number
  loads: {
    start?: number
    end?: number
  }[]
}

const formatDigit = (digit: number, power: number = 10) => {
  if (digit >= power) return String(digit)
  if (power === 100 && digit === 0) return "000"
  return `0${digit}`
}

const formatTime = (time?: number) => {
  if (!time) return "-"

  const millis = Math.floor(time * 100) * 10
  const seconds = Math.floor(millis / 1000)
  const minutes = Math.floor(seconds / 60)
  const hours = Math.floor(minutes / 60)

  if (hours > 0)
    return `${formatDigit(hours)}:${formatDigit(minutes - hours * 60)}:${formatDigit(seconds - minutes * 60)}.${formatDigit(millis - seconds * 1000, 100)}`
  return `${formatDigit(minutes - hours * 60)}:${formatDigit(seconds - minutes * 60)}.${formatDigit(millis - seconds * 1000, 100)}`
}

export default function App() {

  const [url, setUrl] = useState<string>(window.location.href);
  const [hasVideo, setHasVideo] = useState<boolean>(!!document.querySelector("video"));

  const [isEnabled, setEnabled] = useState<boolean>(false);
  const [fps, setFPS] = useState<number>();

  const [runData, setRunData] = useState<RunData>();
  const [isPlaying, setPlaying] = useState<boolean>(false);
  const [speed, setSpeed] = useState<number>(1.0);

  const calculateFPS = () => {
    const vid = document.querySelector("video");
    const startFrame = vid.currentTime;

    let last_media_time, last_frame_num, fps;
    let frame_not_seeked = true;
    const fps_rounder = [];

    vid.play();

    function seeked() {
      fps_rounder.pop();
      frame_not_seeked = false;
    }

    function ticker(_, metadata) {
      const media_time_diff = Math.abs(metadata.mediaTime - last_media_time);
      const frame_num_diff = Math.abs(metadata.presentedFrames - last_frame_num);
      const diff = media_time_diff / frame_num_diff;
      if (
        diff &&
        diff < 1 &&
        frame_not_seeked &&
        fps_rounder.length < 50 &&
        vid.playbackRate === 1 &&
        document.hasFocus()
      ) {
        fps_rounder.push(diff);
        fps = Math.round(1 / get_fps_average());

        if (fps_rounder.length * 2 >= 100) {
          // Target certainty achieved, but don't do more than 60
          setFPS(Math.min(fps, 60.0));
          vid.currentTime = startFrame;
          vid.playbackRate = 1.0;
          vid.pause();
          vid.removeEventListener("seeked", seeked);
        }
      }

      frame_not_seeked = true;
      last_media_time = metadata.mediaTime;
      last_frame_num = metadata.presentedFrames;
      vid.requestVideoFrameCallback(ticker);
    }

    vid.requestVideoFrameCallback(ticker);
    vid.addEventListener("seeked", seeked);

    function get_fps_average() {
      return fps_rounder.reduce((a, b) => a + b) / fps_rounder.length;
    }
  }

  useEffect(() => {
    const listener = (request, sender, sendResponse) => {

      // Service worker has informed us that the URL has changed
      if (request.message === "urlChanged") {
        setUrl(window.location.href)
      }

      // Popup is requesting information
      if (request.message === "popupOpen") {
        sendResponse({ url, hasVideo, isEnabled })
      }

      if (request.message === "startTiming") {
        setEnabled(true);
        calculateFPS();
      }

    }

    chrome.runtime.onMessage.addListener(listener)

    return () => chrome.runtime.onMessage.removeListener(listener);
  }, [hasVideo, isEnabled]);

  useEffect(() => {
    setHasVideo(!!document.querySelector("video"))
  }, [url])

  useEffect(() => {
    const video = document.querySelector("video")

    const playingListener = (e) => {
      setPlaying(true)
    }
    const pauseListener = () => {
      setPlaying(false)
    }

    if (video) {
      video.addEventListener("playing", playingListener)
      video.addEventListener("pause", pauseListener)
    }
    return () => {
      if (video) {
        video.removeEventListener("playing", playingListener)
        video.removeEventListener("pause", pauseListener)
      }
    }
  }, [document.querySelector("video")])

  if (!isEnabled) return null;

  const video = document.querySelector("video")
  const frameLength = 1.0 / fps;

  const play = () => {
    video.play();
    setPlaying(true);
  }

  const pause = () => {
    video.pause();
    setPlaying(false);
  }

  const startRun = () => {
    setRunData({ start: video.currentTime, loads: [] })
    window.addEventListener('beforeunload', (event) => {
      event.preventDefault();
      event.returnValue = '';
    });
  }

  const stopRun = () => {
    setRunData(prev => ({ ...prev, end: video.currentTime }))
  }

  const undoStop = () => {
    setRunData(prev => ({ ...prev, end: undefined }))
  }

  const startLoading = () => {
    setRunData(prev => ({ ...prev, loads: [...prev.loads, { start: video.currentTime }] }))
  }

  const stopLoading = () => {
    setRunData(prev => ({ ...prev, loads: prev.loads.map((l, i, a) => i === a.length - 1 ? { ...l, end: video.currentTime } : l) }))
  }

  const changeSpeed = () => {
    setSpeed(speed => {
      const newSpeed = Math.max((2 * speed) % 8, 1.0)
      video.playbackRate = newSpeed
      return newSpeed
    })
  }

  const totalLoadingTime = runData?.loads.reduce((previous, current) => {
    if (current.start && current.end)
      return previous + current.end - current.start
    return previous
  }, 0)

  return (
    <div className="text-white text-[16px] fixed z-[1000000] bottom-0 w-full h-auto overflow-hidden">
      <div className="font-sans bg-slate-900 m-[16px] p-[16px] border-slate-700 border rounded-[4px] flex gap-[16px] items-center shadow-2xl">

        {fps ?
          <>

            <button className="fill-gray-50 hover:fill-gray-300" onClick={() => video.currentTime -= frameLength}><StepBackwardIcon /></button>
            {!isPlaying ?
              <button className="fill-gray-50 hover:fill-gray-300" onClick={play}><PlayIcon /></button>
              :
              <button className="fill-gray-50 hover:fill-gray-300" onClick={pause}><PauseIcon /></button>
            }
            <button className="fill-gray-50 hover:fill-gray-300" onClick={() => video.currentTime += frameLength}><StepForwardIcon /></button>
            <button className="text-gray-50 hover:text-gray-300 font-bold leading-4" onClick={changeSpeed}>{speed}x</button>


            <span className="block w-[1px] bg-slate-700 h-[24px] rounded-[4px]" />

            {!runData && <button className="text-gray-50 hover:text-gray-300 uppercase font-bold leading-4" onClick={startRun}>Start run</button>}

            {runData?.start && <p>Start: {formatTime(runData.start)}</p>}

            {runData && !runData.end && <button className="text-gray-50 hover:text-gray-300 uppercase font-bold leading-4" onClick={stopRun}>Stop run</button>}

            {runData?.end && <p>End: {formatTime(runData.end)}</p>}
            {runData?.start && runData?.end && <p>RTA: {formatTime(runData.end - runData.start)}</p>}
            {runData?.start && runData?.end && <p>IGT: {formatTime(runData.end - runData.start - totalLoadingTime)}</p>}
            {runData?.start && runData?.end && <button className="text-gray-50 hover:text-gray-300 uppercase font-bold leading-4" onClick={undoStop}>Undo stopping the run</button>}

            {runData && !runData.end &&
              <>
                <span className="block w-[1px] bg-slate-700 h-[24px] rounded-[4px]" />

                {(!runData.loads.at(-1) || runData.loads.at(-1).end) &&
                  <button className="text-gray-50 hover:text-gray-300 uppercase font-bold leading-4" onClick={startLoading}>Start loading</button>}
                {(runData.loads.at(-1) && !runData.loads.at(-1).end) &&
                  <button className="text-gray-50 hover:text-gray-300 uppercase font-bold leading-4" onClick={stopLoading}>Stop loading</button>}

                {totalLoadingTime > 0 && <p>Total loading time: {formatTime(totalLoadingTime)}</p>}

              </>}

          </> : <p>Measuring FPS...</p>}

      </div>

    </div>
  )
}
