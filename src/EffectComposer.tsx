import React, { createRef, useMemo, useEffect, createContext, RefObject } from 'react'
import { useThree, useFrame, useLoader } from 'react-three-fiber'
import {
  EffectComposer as EffectComposerImpl,
  RenderPass,
  EffectPass,
  NormalPass,
  Effect,
  SMAAEffect,
  SMAAImageLoader,
} from 'postprocessing'
import { HalfFloatType } from 'three'

export const EffectComposerContext = createContext<{ composer: EffectComposerImpl; normalPass: NormalPass }>(null)

export type EffectComposerProps = {
  children?: JSX.Element | JSX.Element[]
  smaa?: boolean
  effects?: Effect[]
  edgeDetection?: number
}

const EffectComposer = React.memo(
  (
    { children, smaa, edgeDetection, effects }: EffectComposerProps = {
      edgeDetection: 0.1,
      smaa: true,
    }
  ) => {
    const { gl, scene, camera, size } = useThree()

    const smaaProps: [any, any] = useLoader(SMAAImageLoader, '')

    const [composer, normalPass] = useMemo(() => {
      // Initialize composer
      const effectComposer = new EffectComposerImpl(gl, { frameBufferType: HalfFloatType })

      // Add render pass
      effectComposer.addPass(new RenderPass(scene, camera))

      // Create normal pass
      const pass = new NormalPass(scene, camera)

      // Add SMAAEffect

      if (smaa) {
        const smaaEffect = new SMAAEffect(...smaaProps)
        smaaEffect.colorEdgesMaterial.setEdgeDetectionThreshold(edgeDetection)
      }

      return [effectComposer, pass]
    }, [camera, gl, scene])

    useEffect(() => void composer.setSize(size.width, size.height), [composer, size])
    useFrame((_, delta) => composer.render(delta), 1)

    const refs = useMemo(
      (): RefObject<Effect>[] => [...new Array(React.Children.count(children))].map(createRef) as RefObject<Effect>[],
      [children]
    )

    useEffect(() => {
      composer.addPass(normalPass)
      const effectPass = new EffectPass(camera, ...refs.map((r) => r.current), ...effects)
      composer.addPass(effectPass)
      effectPass.renderToScreen = true
      return () => composer.reset()
    }, [children, composer, camera, normalPass, refs])

    return (
      <EffectComposerContext.Provider value={{ composer, normalPass }}>
        {React.Children.map(children, (el: JSX.Element, i) => (
          <el.type {...el.props} ref={refs[i]} />
        ))}
      </EffectComposerContext.Provider>
    )
  }
)

export default EffectComposer