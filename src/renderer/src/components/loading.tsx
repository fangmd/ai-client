import { useLottie } from 'lottie-react'
import React, { useEffect, useRef } from 'react'
import animationData from '@renderer/assets/animate/play_loading_dot.json'

interface CoolCompProps {
  // coolRef: Ref<any>
}

/** LoadingAnimation */
export const LoadingAnimation: React.FC<CoolCompProps> = ({}) => {
  const frameData = useRef({
    firstFrame: 0,
    currentFrame: 0,
    currentTime: 0,
  })
  const { View, play, stop, goToAndStop, goToAndPlay, playSegments } = useLottie({
    animationData: animationData,
    loop: true,
    autoplay: true,
    onDataReady: () => {
      // console.log('onDataReady')
      // playSegments([frameData.current.currentFrame, 30], true)
    },
    onConfigReady: () => {
      // console.log('onConfigReady')
      // playSegments([frameData.current.currentFrame, 30], true)
    },
    onComplete: () => {
      // console.log('the animation completed: confirm')
      // window.android?.animationEnd('confirm')
      // setTimeout(() => {
      //   stop()
      //   setShowAnimation(false)
      // }, 1000)
    },
    onSegmentStart: (event: any) => {
      // console.log('args', event)
      frameData.current.firstFrame = event.firstFrame
    },
    onEnterFrame: (event: any) => {
      // console.log('onEnterFrame', event)
      // frameData.current.currentFrame = frameData.current.firstFrame + event.currentTime
    },
    style: {
      width: 45,
      height: 45,
    },
    rendererSettings: {
      className: 'cool_lottie_svg',
    },
  })

  useEffect(() => {
    // playSegments([0, 52], true)
  }, [])

  // useImperativeHandle(coolRef, () => {
  //   return {
  //     resetTo: (progress: number) => {
  //       console.log('resetTo', progress)
  //       frameData.current.currentFrame = progress
  //       playSegments([progress, progress + 1], true)
  //     },
  //     playTo: (progress: number) => {
  //       console.log('playTo [frameData.current.currentFrame, progress]', [frameData.current.currentFrame, progress])
  //       playSegments([frameData.current.currentFrame, progress], true)
  //     },
  //     stop: () => {
  //       playSegments([frameData.current.currentFrame, frameData.current.currentFrame + 1], true)
  //     },
  //   }
  // })

  return <div className="relative w-10 h-10">{View}</div>
}
