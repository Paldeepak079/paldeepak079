import { useGLTF } from '@react-three/drei';

export function preloadModel() {
  useGLTF.preload('../lanyard/card.glb');
} 