async function loadCustomFont() {
  const font = new FontFace(
    "Rinse",
    "url(https://db.onlinewebfonts.com/t/9ed0ddbb96c55d30cce04f3a5343594a.woff2)"
  );

  await font.load(); // Espera a que la fuente se cargue
  (document.fonts as any).add(font); // Agrega la fuente al documento
}

import React, { useEffect, useRef, useState } from 'react'

import { PortraitIcon } from '.'

const framePad = 36 // Padding around portrait frame
const portraitPad = 12 // Padding around image
const spacing = 29 // Spacing between portrait frames
const portraitSize = 256 // 256 for GI, 128 for HSR
const elementalSizeMultiplier = 1 / 4
const lineOffset = 3
const bottomOffset = 20 // Padding from bottom of frame from portrait for text
const noteExtraWidth = 20
const noteHeight = 45
const noteFont = "bold 25px \"Arial\""
const nameFont = "bold 17px \"Arial\""

export default function Preview({ active, remove, background, portraitPadding, names }: { active: PortraitIcon[], remove: (i: number) => void, background: boolean, portraitPadding: boolean, names: boolean }) {
  const canvasRef = useRef(null as HTMLCanvasElement)
  const containerRef = useRef(null as HTMLDivElement)
  const [hovering, setHovering] = useState(false)
  const [isSticky, setIsSticky] = useState(false)
  const [originalOffset, setOriginalOffset] = useState(0)
  const [containerWidth, setContainerWidth] = useState(0)

  const effectiveFramePad = background ? framePad : 0
  const effectivePortraitPad = portraitPadding ? portraitPad : 0
  const frameSize = portraitSize + 2 * effectivePortraitPad
  const totalWidth = effectiveFramePad * 2 + frameSize * active.length + spacing * (active.length - 1)
  const totalHeight = 2 * effectiveFramePad + 2 * effectivePortraitPad + portraitSize + (names ? (background ? bottomOffset : bottomOffset + framePad) : 0)

  function getName(x: PortraitIcon) {
    return `${x.name}${x.others ? "+" + x.others.map(x => getName(x)).join("+") : ""}`
  }
  const list = active.map(x => getName(x)).join(" - ")

  useEffect(() => {
    async function initializeCanvas() {
      await loadCustomFont(); // Espera a que la fuente "Rinse" se cargue
  
      const canvas = canvasRef.current;
      const ctx = canvas.getContext("2d");
  
      // Configura el canvas y renderiza el contenido
      canvas.width = totalWidth;
      canvas.height = totalHeight;
  
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = "high";
  
      if (background) {
        ctx.fillStyle = "#121212";
        ctx.strokeStyle = "#000000";
      } else {
        ctx.fillStyle = "transparent";
        ctx.strokeStyle = "transparent";
      }
      roundRect(ctx, 0, 0, totalWidth, totalHeight, 19);
  
      for (let i = 0; i < active.length; i++) {
        const leftBorder = effectiveFramePad + i * (frameSize + spacing);
        if (background) {
          ctx.save();
          // Degradado radial oscuro para diferenciar de los badges
          const cx = leftBorder + frameSize / 2;
          const cy = effectiveFramePad + (portraitSize + 2 * effectivePortraitPad) / 2;
          const radius = Math.max(frameSize, portraitSize + 2 * effectivePortraitPad) * 0.6;
          const grad = ctx.createRadialGradient(
            cx, cy, radius * 0.2, // centro y radio interno
            cx, cy, radius // radio externo
          );
          grad.addColorStop(0, 'rgba(25,27,36,0.98)'); // centro, casi negro
          grad.addColorStop(0.5, 'rgba(34,37,54,0.92)'); // azul oscuro
          grad.addColorStop(1, 'rgba(10,12,20,0.88)'); // borde, negro azulado
          ctx.fillStyle = grad;
          ctx.shadowColor = 'rgba(0,0,0,0.5)';
          ctx.shadowBlur = 16;
          roundRect(ctx, leftBorder, effectiveFramePad, frameSize, portraitSize + 2 * effectivePortraitPad, 16);
          ctx.shadowBlur = 0;
          ctx.restore();
        }
  
        const icon = active[i];
  
        const x = leftBorder + effectivePortraitPad;
        const y = effectiveFramePad + effectivePortraitPad;
        await drawIcon(ctx, icon, x, y, portraitSize, names);

        // Artefactos (alineados sobre el eje de simetría esquina sup. derecha a inf. izquierda)
        if (icon.artifacts && icon.artifacts.length > 0) {
          const badgeSize = 64;
          let baseX: number, baseY: number;
          if (icon.artifacts.length === 1) {
            // MISMA alineación que el arma, pero esquina superior derecha
            baseX = x + portraitSize - badgeSize + 4;
            baseY = y - 4;
            for (let j = 0; j < 1; j++) {
              const art = icon.artifacts[j];
              const artImg = await loadImage(art.path);
              const badgeX = baseX;
              const badgeY = baseY;
              ctx.save();
              // Fondo badge degradado normal (sin transparencia)
              const grad = ctx.createLinearGradient(badgeX, badgeY, badgeX + badgeSize, badgeY + badgeSize);
              grad.addColorStop(0, 'rgba(30,30,40,0.93)');
              grad.addColorStop(0.6, 'rgba(50,50,70,0.85)');
              grad.addColorStop(1, 'rgba(20,20,30,0.88)');
              ctx.fillStyle = grad;
              ctx.shadowColor = 'rgba(0,0,0,0.4)';
              ctx.shadowBlur = 8;
              roundRect(ctx, badgeX, badgeY, badgeSize, badgeSize, 8);
              ctx.shadowBlur = 0;
              ctx.clip();
              // Imagen
              ctx.drawImage(artImg, badgeX + 7, badgeY + 7, badgeSize - 14, badgeSize - 14);
              ctx.restore();
            }
          } else {
            // Múltiples artefactos: alineación diagonal con degradado direccional
            const overlap = 16; // Solapamiento entre badges
            const totalWidth = badgeSize + (icon.artifacts.length - 1) * (badgeSize - overlap);
            baseX = x + portraitSize - totalWidth + 4;
            baseY = y - 4;
            
            // Renderizar en orden normal para que los primeros aparezcan debajo
            for (let j = 0; j < icon.artifacts.length; j++) {
              const art = icon.artifacts[j];
              const artImg = await loadImage(art.path);
              const badgeX = baseX + j * (badgeSize - overlap);
              const badgeY = baseY + j * 8; // Ligero desplazamiento vertical
              
              ctx.save();
              
              // Sistema de degradado específico según la posición
              let grad;
              if (j === 0) {
                // Primer badge: fondo normal
                grad = ctx.createLinearGradient(badgeX, badgeY, badgeX + badgeSize, badgeY + badgeSize);
                grad.addColorStop(0, 'rgba(30,30,40,0.93)');
                grad.addColorStop(0.6, 'rgba(50,50,70,0.85)');
                grad.addColorStop(1, 'rgba(80,80,110,0.65)');
              } else {
                // Siguientes badges: degradado transparente -> opaco en dirección del solapamiento
                grad = ctx.createLinearGradient(badgeX, badgeY, badgeX + badgeSize * 1.3, badgeY + badgeSize * 0.2);
                grad.addColorStop(0, 'rgba(30,30,40,0.0)');
                grad.addColorStop(0.05, 'rgba(30,30,40,0.0)');
                grad.addColorStop(0.25, 'rgba(50,50,70,0.85)');
                grad.addColorStop(1, 'rgba(80,80,110,0.65)');
              }
              
              ctx.fillStyle = grad;
              ctx.shadowColor = 'rgba(0,0,0,0.4)';
              ctx.shadowBlur = 8;
              
              // Path personalizado con bordes redondeados usando quadraticCurveTo
              ctx.beginPath();
              ctx.moveTo(badgeX + 12, badgeY);
              ctx.lineTo(badgeX + badgeSize - 12, badgeY);
              ctx.quadraticCurveTo(badgeX + badgeSize, badgeY, badgeX + badgeSize, badgeY + 12);
              ctx.lineTo(badgeX + badgeSize, badgeY + badgeSize - 12);
              ctx.quadraticCurveTo(badgeX + badgeSize, badgeY + badgeSize, badgeX + badgeSize - 12, badgeY + badgeSize);
              ctx.lineTo(badgeX + 12, badgeY + badgeSize);
              ctx.quadraticCurveTo(badgeX, badgeY + badgeSize, badgeX, badgeY + badgeSize - 12);
              ctx.lineTo(badgeX, badgeY + 12);
              ctx.quadraticCurveTo(badgeX, badgeY, badgeX + 12, badgeY);
              ctx.closePath();
              
              ctx.fill();
              ctx.shadowBlur = 0;
              ctx.clip();
              
              // Imagen del artefacto
              ctx.drawImage(artImg, badgeX + 7, badgeY + 7, badgeSize - 14, badgeSize - 14);
              ctx.restore();
            }
          }
        }
        // Arma (esquina inferior izquierda)
        if (icon.weapon) {
          const weaponImg = await loadImage(icon.weapon.path);
          const badgeSize = 64;
          const badgeX = x - 4;
          const badgeY = y + portraitSize - badgeSize + 4;
          ctx.save();
          // Fondo badge degradado normal (sin transparencia)
          const grad = ctx.createLinearGradient(badgeX, badgeY, badgeX + badgeSize, badgeY + badgeSize);
          grad.addColorStop(0, 'rgba(30,30,40,0.93)');
          grad.addColorStop(0.6, 'rgba(50,50,70,0.85)');
          grad.addColorStop(1, 'rgba(20,20,30,0.88)');
          ctx.fillStyle = grad;
          ctx.shadowColor = 'rgba(0,0,0,0.4)';
          ctx.shadowBlur = 8;
          roundRect(ctx, badgeX, badgeY, badgeSize, badgeSize, 8);
          ctx.shadowBlur = 0;
          
          // Borde de rareza para armas
          if (icon.weapon.rarity) {
            const rarityColors = getRarityBorderColors(icon.weapon.rarity);
            ctx.lineWidth = 3;
            const borderGrad = ctx.createLinearGradient(badgeX, badgeY, badgeX + badgeSize, badgeY + badgeSize);
            borderGrad.addColorStop(0, rarityColors.borderColor1);
            borderGrad.addColorStop(0.5, rarityColors.borderColor2);
            borderGrad.addColorStop(1, rarityColors.borderColor3);
            ctx.strokeStyle = borderGrad;
            ctx.stroke();
          }
          
          ctx.shadowBlur = 0;
          ctx.clip();
          // Imagen
          ctx.drawImage(weaponImg, badgeX + 7, badgeY + 7, badgeSize - 14, badgeSize - 14);
          ctx.restore();
        }
      }
  
      const hasNote = active.some(icon => icon.note && icon.note.length > 0);
      addFooterToCanvas(canvasRef.current, list, hasNote);
    }
  
    initializeCanvas();
  }, [active, background, effectivePortraitPad, names]);

  // Estado para la transición gradual
  const [scrollProgress, setScrollProgress] = useState(0);
  const [transitionActive, setTransitionActive] = useState(false);
  const [navbarHeight, setNavbarHeight] = useState(60); // Altura por defecto del navbar
  const [lastScrollY, setLastScrollY] = useState(0); // Para detectar dirección de scroll
  const [scrollDirection, setScrollDirection] = useState('down'); // 'up' o 'down'

  // Efecto para manejar el scroll y posicionamiento fijo con animación de barrido
  useEffect(() => {
    let ticking = false;
    
    const handleScroll = () => {
      if (!ticking) {
        requestAnimationFrame(() => {
          if (!containerRef.current) {
            ticking = false;
            return;
          }

          // Detectar dirección de scroll
          const currentScrollY = window.scrollY;
          const newScrollDirection = currentScrollY > lastScrollY ? 'down' : 'up';
          
          if (newScrollDirection !== scrollDirection) {
            setScrollDirection(newScrollDirection);
          }
          setLastScrollY(currentScrollY);

          // Obtener altura real del navbar
          const navbar = document.querySelector('.navbar');
          const currentNavbarHeight = navbar ? navbar.getBoundingClientRect().height : 60;
          if (currentNavbarHeight !== navbarHeight) {
            setNavbarHeight(currentNavbarHeight);
          }

           const containerRect = containerRef.current.getBoundingClientRect();
           const viewportHeight = window.innerHeight;
           const transitionZone = Math.min(80, viewportHeight * 0.1); // Zona adaptativa (máx 80px o 10% del viewport)
           const startTransition = currentNavbarHeight + 2; // Comienza cuando toca el navbar + 2px de anticipación
           const endTransition = currentNavbarHeight - transitionZone; // Termina después de la zona de transición
           
           // Calcular progreso de la transición con detección mejorada
           let progress = 0;
           
           // Verificar si el contenedor está en su posición original o por encima
           const containerTop = containerRect.top;
           
           // Calcular el bottom del canvas (sin incluir el enlace de descarga)
           const canvasBottom = containerTop + totalHeight;
           
           // NUEVA LÓGICA: Solo evaluar retorno a posición original durante scroll UP
           if (containerTop <= startTransition) {
             // El elemento ha alcanzado el navbar - activar sticky
             
             if (newScrollDirection === 'up') {
               // Solo durante scroll UP: verificar si debe regresar a posición original
               const hasPassedUp = canvasBottom <= currentNavbarHeight;
               
               if (hasPassedUp) {
                 // El canvas ha pasado completamente hacia arriba - volver a estado normal
                 progress = 0;
               } else {
                 // Mantener sticky o en transición
                 if (containerTop >= endTransition) {
                   // En zona de transición - calcular progreso suave
                   progress = (startTransition - containerTop) / (transitionZone + 2);
                   progress = Math.max(0, Math.min(1, progress));
                   // Aplicar easing cúbico para máxima suavidad
                   progress = progress < 0.5 
                     ? 4 * progress * progress * progress 
                     : 1 - Math.pow(-2 * progress + 2, 3) / 2;
                 } else {
                   // Completamente sticky
                   progress = 1;
                 }
               }
             } else {
               // Durante scroll DOWN: mantener sticky indefinidamente
               if (containerTop >= endTransition) {
                 // En zona de transición - calcular progreso suave
                 progress = (startTransition - containerTop) / (transitionZone + 2);
                 progress = Math.max(0, Math.min(1, progress));
                 // Aplicar easing cúbico para máxima suavidad
                 progress = progress < 0.5 
                   ? 4 * progress * progress * progress 
                   : 1 - Math.pow(-2 * progress + 2, 3) / 2;
               } else {
                 // Completamente sticky - mantener indefinidamente durante scroll down
                 progress = 1;
               }
             }
           } else {
             // El contenedor está por debajo del navbar - estado normal
             progress = 0;
           }

           // Actualizar estados con debouncing mejorado
           const newTransitionActive = progress > 0.001 && progress < 0.999;
           const shouldBeSticky = progress >= 0.999;

           if (Math.abs(scrollProgress - progress) > 0.0005) {
             setScrollProgress(progress);
           }
           
           if (newTransitionActive !== transitionActive) {
             setTransitionActive(newTransitionActive);
           }

           if (shouldBeSticky !== isSticky) {
             setIsSticky(shouldBeSticky);
           }
           
           ticking = false;
         });
         ticking = true;
       }
     };

    const handleResize = () => {
      if (!containerRef.current) return;
      
      const containerRect = containerRef.current.getBoundingClientRect();
      setContainerWidth(containerRect.width);
      
      // Actualizar offset original cuando no está sticky
      if (!isSticky) {
        setOriginalOffset(containerRef.current.offsetLeft);
      }
    };

    // Configurar valores iniciales
    handleResize();
    
    // Usar el scroll handler optimizado directamente
    window.addEventListener('scroll', handleScroll, { passive: true });
    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('scroll', handleScroll);
      window.removeEventListener('resize', handleResize);
    };
  }, [isSticky]);

  // Actualizar offset original cuando el componente se monta
  useEffect(() => {
    if (containerRef.current && !isSticky) {
      setOriginalOffset(containerRef.current.offsetLeft);
      setContainerWidth(containerRef.current.getBoundingClientRect().width);
    }
  }, [active, isSticky]);

  // Función para obtener colores de rareza para el borde
  function getRarityBorderColors(rarity: string) {
    if (rarity === '1_star') {
      return {
        borderColor1: 'rgba(149,152,154,0.9)',
        borderColor2: 'rgba(129,132,134,0.8)',
        borderColor3: 'rgba(89,92,94,0.7)'
      };
    } else if (rarity === '2_star') {
      return {
        borderColor1: 'rgba(110,171,142,0.9)',
        borderColor2: 'rgba(90,151,122,0.8)',
        borderColor3: 'rgba(50,111,82,0.7)'
      };
    } else if (rarity === '3_star') {
      return {
        borderColor1: 'rgba(110,155,193,0.9)',
        borderColor2: 'rgba(89,135,173,0.8)',
        borderColor3: 'rgba(69,115,153,0.7)'
      };
    } else if (rarity === '4_star') {
      return {
        borderColor1: 'rgba(168,132,207,0.9)',
        borderColor2: 'rgba(148,112,187,0.8)',
        borderColor3: 'rgba(128,92,167,0.7)'
      };
    } else if (rarity === '5_star') {
      return {
        borderColor1: 'rgba(220,144,56,0.9)',
        borderColor2: 'rgba(200,124,36,0.8)',
        borderColor3: 'rgba(180,104,16,0.7)'
      };
    }
    // Sin borde especial para armas sin rareza
    return null;
  }

  return <div 
    ref={containerRef}
    style={{
      position: 'relative',
      // Mantener altura constante para evitar cambios de layout
      minHeight: `${totalHeight}px`
    }}
  >
    {/* Contenedor con altura fija para evitar colapso */}
    <div style={{ 
      minHeight: `${totalHeight + 15}px`, // totalHeight + más espacio para el enlace y margen inferior
      position: 'relative',
      marginBottom: '2rem' // Espacio adicional en la parte inferior
    }}>
      {/* Canvas con posicionamiento condicional */}
      <canvas
        ref={canvasRef}
        onClick={(e) => {
          const i = getIndex(effectiveFramePad, effectivePortraitPad, frameSize, e)
          if (i >= 0 && i < active.length) remove(i)
        }}
        onMouseMove={(e) => {
          const i = getIndex(effectiveFramePad, effectivePortraitPad, frameSize, e)
          const shouldHover = i >= 0 && i < active.length
          if (shouldHover !== hovering) setHovering(shouldHover)
        }}
        style={{
          cursor: hovering ? "pointer" : "auto",
          position: isSticky || transitionActive ? 'fixed' : 'static',
          top: isSticky || transitionActive ? `${navbarHeight + (-scrollProgress * 20)}px` : 'auto',
          left: isSticky || transitionActive ? `${originalOffset}px` : 'auto',
          width: isSticky || transitionActive ? `${totalWidth}px` : 'auto',
          zIndex: isSticky || transitionActive ? 999 : 'auto',
          transform: transitionActive ? `translateY(${(1 - scrollProgress) * 20}px) scale(${0.98 + 0.02 * scrollProgress})` : 'none',
          transition: transitionActive ? 'none' : 'all 0.3s cubic-bezier(0.23, 1, 0.32, 1)',
          boxShadow: `0 ${4 * scrollProgress}px ${12 * scrollProgress}px rgba(0,0,0,${0.3 * scrollProgress})`,
          borderRadius: `0 0 ${8 * scrollProgress}px ${8 * scrollProgress}px`,
          opacity: 0.85 + 0.15 * scrollProgress
        }}
      />
      
      {/* Enlace de descarga con posición absoluta dentro del contenedor */}
      <div style={{ 
        position: 'absolute',
        top: `${totalHeight + 24}px`, // Más espacio desde el canvas
        left: 0,
        width: '100%',
        paddingBottom: '1rem' // Espacio adicional debajo del enlace
      }}>
        <a href="#" onClick={(e) => {
          e.preventDefault()

          const link = document.createElement('a');
          link.download = `Portraits ${list}.png`;
          link.href = canvasRef.current.toDataURL("image/png")
          link.click()
        }}>Download output as "DarkJake {list}.png"</a>
      </div>
    </div>
  </div>
}

function addFooterToCanvas(canvas: HTMLCanvasElement, list: string, hasNote: boolean) {
  const ctx = canvas.getContext("2d");
  ctx.font = "16px 'Rinse'";
  const text = "Powered By DarkJake";
  const textWidth = ctx.measureText(text).width;
  
  let x: number;
  if (hasNote) {
    x = ((canvas.width - textWidth) / 2) + 87; // Calcula la posición X centrada con ajuste
  } else {
    x = (canvas.width - textWidth) / 2; // Calcula la posición X centrada sin ajuste
  }

  const y = canvas.height - 14;
  ctx.fillStyle = "#00B0F0";
  ctx.fillText(text, x, y);
}

function loadImage(path: string): Promise<HTMLImageElement> {
  return new Promise((resolve) => {
    const img = new Image()
    img.src = path
    img.crossOrigin = "anonymous"
    img.onload = () => resolve(img)
  })
}

async function drawIcon(ctx: CanvasRenderingContext2D, icon: PortraitIcon, x: number, y: number, size: number, names: boolean) {
  const baseImage = await loadImage(icon.path)
  if (icon.others) {
    if (icon.others.length == 1) {
      // 2 images
      await drawTopHalf(ctx, icon, baseImage, x, y, size)

      const secondIcon = icon.others[0]
      const second = await loadImage(secondIcon.path)
      await drawBottomHalf(ctx, secondIcon, second, x, y, size)

      drawDiagonal(ctx, x, y, size)
    } else {
      // 3/4 images
      await drawTopCenter(ctx, icon, baseImage, x, y, size)

      const secondIcon = icon.others[0]
      const second = await loadImage(secondIcon.path)
      await drawLeftCenter(ctx, secondIcon, second, x, y, size)

      const thirdIcon = icon.others[1]
      const third = await loadImage(thirdIcon.path)
      if (icon.others.length == 2) {
        // 3 images
        await drawBottomHalf(ctx, thirdIcon, third, x, y, size)

        drawDiagonal(ctx, x, y, size)
        drawTLHalfDiagonal(ctx, x, y, size)
      } else {
        // 4 images
        await drawRightCenter(ctx, thirdIcon, third, x, y, size)

        const fourthIcon = icon.others[2]
        const fourth = await loadImage(fourthIcon.path)

        await drawBottomCenter(ctx, fourthIcon, fourth, x, y, size)

        drawDiagonal(ctx, x, y, size)
        drawTLDiagonal(ctx, x, y, size)
      }
    }

  } else {
    // Draw singular
    drawImg(ctx, icon, baseImage, x, y, size)

    if (icon.note) {
      let noteX, noteY;
      ctx.font = noteFont;
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      const w = ctx.measureText(icon.note).width + noteExtraWidth;
      // Guarda el textAlign original
      const prevTextAlign = ctx.textAlign;
      if (icon.artifacts && icon.artifacts.length > 0) {
        // Esquina superior izquierda, centrado dentro del recuadro
        noteX = x + portraitPad / 2 - 12;
        noteY = y - portraitPad / 2 + 2;
        ctx.save();
        // Degradado azul, más similar al estilo original
        const grad = ctx.createLinearGradient(noteX, noteY, noteX + w, noteY + noteHeight);
        grad.addColorStop(0, 'rgba(0,122,174,0.98)'); // azul fuerte
        grad.addColorStop(0.6, 'rgba(0,160,255,0.92)'); // azul claro
        grad.addColorStop(1, 'rgba(30,80,180,0.75)'); // azul profundo
        ctx.fillStyle = grad;
        ctx.shadowColor = 'rgba(0,0,0,0.7)';
        ctx.shadowBlur = 16;
        roundRect(ctx, noteX, noteY, w, noteHeight);
        ctx.shadowBlur = 0;
        ctx.restore();
        ctx.fillStyle = "#FFFFFF";
        ctx.fillText(icon.note, noteX + w / 2, noteY + noteHeight / 2);
      } else {
        // Esquina superior derecha
        noteX = x + portraitPad / 2 + size;
        noteY = y - portraitPad / 2;
        ctx.save();
        const grad = ctx.createLinearGradient(noteX - w, noteY, noteX, noteY + noteHeight);
        grad.addColorStop(0, 'rgba(0,122,174,0.98)');
        grad.addColorStop(0.6, 'rgba(0,160,255,0.92)');
        grad.addColorStop(1, 'rgba(30,80,180,0.75)');
        ctx.fillStyle = grad;
        ctx.shadowColor = 'rgba(0,0,0,0.7)';
        ctx.shadowBlur = 16;
        roundRect(ctx, noteX - w, noteY, w, noteHeight);
        ctx.shadowBlur = 0;
        ctx.restore();
        ctx.fillStyle = "#FFFFFF";
        ctx.fillText(icon.note, noteX - w / 2, noteY + noteHeight / 2);
      }
      // Restaura el textAlign original
      ctx.textAlign = prevTextAlign;
    }
  }
}

async function drawImg(ctx: CanvasRenderingContext2D, icon: PortraitIcon, baseImage: HTMLImageElement, x: number, y: number, size: number) {
  ctx.drawImage(baseImage, x, y, size, size)
  if (icon.elementalIcon) {
    const elementalImage = await loadImage(icon.elementalIcon.path)
    ctx.drawImage(elementalImage, x, y, size * elementalSizeMultiplier, size * elementalSizeMultiplier)
  }
}

async function drawBottomHalf(ctx: CanvasRenderingContext2D, icon: PortraitIcon, img: HTMLImageElement, x: number, y: number, size: number) {
  const half = size / 2
  ctx.save()
  ctx.beginPath()
  ctx.moveTo(x + size, y)
  ctx.lineTo(x + size, y + size)
  ctx.lineTo(x, y + size)
  ctx.clip()
  if (icon.full) {
    await drawImg(ctx, icon, img, x, y, size)
  } else {
    await drawImg(ctx, icon, img, x + half, y + half, half)
  }
  ctx.restore()
}

async function drawTopHalf(ctx: CanvasRenderingContext2D, icon: PortraitIcon, img: HTMLImageElement, x: number, y: number, size: number) {
  const half = size / 2
  ctx.save()
  ctx.beginPath()
  ctx.moveTo(x, y)
  ctx.lineTo(x + size, y)
  ctx.lineTo(x, y + size)
  ctx.clip()
  if (icon.full) {
    await drawImg(ctx, icon, img, x, y, size)
  } else {
    await drawImg(ctx, icon, img, x, y, half)
  }
  ctx.restore()
}

async function drawTopCenter(ctx: CanvasRenderingContext2D, icon: PortraitIcon, img: HTMLImageElement, x: number, y: number, size: number) {
  const half = size / 2
  const smaller = half * .8
  ctx.save()
  ctx.beginPath()
  ctx.moveTo(x, y)
  ctx.lineTo(x + size, y)
  ctx.lineTo(x + half, y + half)
  ctx.lineTo(x, y)
  ctx.clip()
  if (icon.full) {
    await drawImg(ctx, icon, img, x, y, size)
  } else {
    await drawImg(ctx, icon, img, x + half - smaller / 2, y, smaller)
  }
  ctx.restore()
}

async function drawLeftCenter(ctx: CanvasRenderingContext2D, icon: PortraitIcon, img: HTMLImageElement, x: number, y: number, size: number) {
  const half = size / 2
  const smaller = half * .8
  ctx.save()
  ctx.beginPath()
  ctx.moveTo(x, y)
  ctx.lineTo(x, y + size)
  ctx.lineTo(x + half, y + half)
  ctx.lineTo(x, y)
  ctx.clip()
  if (icon.full) {
    await drawImg(ctx, icon, img, x, y, size)
  } else {
    await drawImg(ctx, icon, img, x, y + half - smaller / 2, smaller)
  }
  ctx.restore()
}

async function drawRightCenter(ctx: CanvasRenderingContext2D, icon: PortraitIcon, img: HTMLImageElement, x: number, y: number, size: number) {
  const half = size / 2
  const smaller = half * .8
  ctx.save()
  ctx.beginPath()
  ctx.moveTo(x + size, y)
  ctx.lineTo(x + size, y + size)
  ctx.lineTo(x + half, y + half)
  ctx.lineTo(x + size, y)
  ctx.clip()
  if (icon.full) {
    await drawImg(ctx, icon, img, x, y, size)
  } else {
    await drawImg(ctx, icon, img, x + size - smaller, y + half - smaller / 2, smaller)
  }
  ctx.restore()
}

async function drawBottomCenter(ctx: CanvasRenderingContext2D, icon: PortraitIcon, img: HTMLImageElement, x: number, y: number, size: number) {
  const half = size / 2
  const smaller = half * .8
  ctx.save()
  ctx.beginPath()
  ctx.moveTo(x, y + size)
  ctx.lineTo(x + size, y + size)
  ctx.lineTo(x + half, y + half)
  ctx.lineTo(x, y + size)
  ctx.clip()
  if (icon.full) {
    await drawImg(ctx, icon, img, x, y, size)
  } else {
    await drawImg(ctx, icon, img, x + half - smaller / 2, y + size - smaller, smaller)
  }
  ctx.restore()
}
function drawDiagonal(ctx: CanvasRenderingContext2D, x: number, y: number, size: number) {
  ctx.strokeStyle = "#FFFFFF"
  ctx.lineWidth = 2
  ctx.beginPath()
  ctx.moveTo(x + lineOffset, y + size - lineOffset)
  ctx.lineTo(x + size - lineOffset, y + lineOffset)
  ctx.stroke()
}
function drawTLHalfDiagonal(ctx: CanvasRenderingContext2D, x: number, y: number, size: number) {
  ctx.strokeStyle = "#FFFFFF"
  ctx.lineWidth = 2
  ctx.beginPath()
  ctx.moveTo(x + lineOffset, y + lineOffset)
  ctx.lineTo(x + size / 2, y + size / 2)
  ctx.stroke()
}
function drawTLDiagonal(ctx: CanvasRenderingContext2D, x: number, y: number, size: number) {
  ctx.strokeStyle = "#FFFFFF"
  ctx.lineWidth = 2
  ctx.beginPath()
  ctx.moveTo(x + lineOffset, y + lineOffset)
  ctx.lineTo(x + size - lineOffset, y + size - lineOffset)
  ctx.stroke()
}

function getIndex(effectiveFramePad: number, effectivePortraitPad: number, frameSize: number, e: React.MouseEvent<HTMLCanvasElement, MouseEvent>) {
  const rect = e.currentTarget.getBoundingClientRect()
  const x = e.clientX - rect.left
  const y = e.clientY - rect.top

  if (y < effectiveFramePad || y > effectiveFramePad + frameSize) return -1

  const i = Math.floor((x - effectiveFramePad) / (frameSize + spacing))
  const leftBorder = effectiveFramePad + i * (frameSize + spacing)

  const xMin = leftBorder
  const xMax = xMin + portraitSize + effectivePortraitPad * 2

  if (i < 0 || x < xMin || x > xMax) return -1
  return i
}

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, width: number, height: number, radius = 5) {
  ctx.beginPath()
  ctx.moveTo(x + radius, y)
  ctx.lineTo(x + width - radius, y)
  ctx.quadraticCurveTo(x + width, y, x + width, y + radius)
  ctx.lineTo(x + width, y + height - radius)
  ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height)
  ctx.lineTo(x + radius, y + height)
  ctx.quadraticCurveTo(x, y + height, x, y + height - radius)
  ctx.lineTo(x, y + radius)
  ctx.quadraticCurveTo(x, y, x + radius, y)
  ctx.closePath()

  ctx.fill()
}

// https://fjolt.com/article/html-canvas-how-to-wrap-text
/**
 * wrapText wraps HTML canvas text onto a canvas of fixed width
 * @param ctx - the context for the canvas we want to wrap text on
 * @param text - the text we want to wrap.
 * @param x - the X starting point of the text on the canvas.
 * @param y - the Y starting point of the text on the canvas.
 * @param maxWidth - the width at which we want line breaks to begin - i.e. the maximum width of the canvas.
 * @param lineHeight - the height of each line, so we can space them below each other.
 * @returns an array of [ lineText, x, y ] for all lines
 */
function wrapText(ctx: CanvasRenderingContext2D, text: string, x: number, y: number, maxWidth: number, lineHeight: number) {
  
  let words = text.split(' ');
  let line = ''; 
  let testLine = ''; 
  let lineArray = []; 

  for (var n = 0; n < words.length; n++) {
    
    testLine += `${words[n]} `;
    let metrics = ctx.measureText(testLine);
    let testWidth = metrics.width;
    
    if (testWidth > maxWidth && n > 0) {
      lineArray.push([line, x, y]);
      y += lineHeight;
      line = `${words[n]} `;
      testLine = `${words[n]} `;
    }
    else {
      line += `${words[n]} `;
    }
    if (n === words.length - 1) {
      lineArray.push([line, x, y]);
    }
  }
  return lineArray;
}