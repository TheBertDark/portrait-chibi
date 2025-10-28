import React from "react"

import { PortraitIcon } from '.'

export default function CharSelector({ icons, onClick, onCtrlClick }: { icons: PortraitIcon[], onClick: (icon: PortraitIcon, multi: boolean, note: boolean) => void, onCtrlClick?: (icon: PortraitIcon) => void }) {
  return <div style={{
    display: "flex",
    flexWrap: "wrap",
    gap: "3px",
    alignItems: "center"
  }}>
    {icons.map(icon => {
      const { name, path, elementalIcon, rarityClass } = icon

      return <div key={name} style={({
        position: "relative",
        display: "inline-block",
        margin: "2px"
      })}>
        <img alt={name} title={name}
          src={path}
          width={128} height={128}
          className={`${rarityClass || 'portrait-icon-hover'}`}
          style={({
            cursor: "pointer"
          })}
          onClick={(e) => e.ctrlKey && onCtrlClick ? onCtrlClick(icon) : onClick(icon, e.shiftKey, e.altKey)}
        />
        {elementalIcon && <img 
          src={elementalIcon.path}
          width={32} height={32}
          style={({
            position: "absolute",
            left: "0px"
          })}
        />}
      </div>
    })}</div>
}