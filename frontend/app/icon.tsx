import { ImageResponse } from "next/og";

export const size = { width: 32, height: 32 };
export const contentType = "image/png";

export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          background: "#FAF7F2",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          borderRadius: 6,
        }}
      >
        <svg
          width="22"
          height="22"
          viewBox="0 0 22 22"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            d="M 2 11 L 11 3 L 20 11 L 20 19 L 2 19 Z"
            fill="none"
            stroke="#1A1A1A"
            strokeWidth="2"
            strokeLinejoin="round"
          />
          <circle cx="11" cy="14" r="2.5" fill="#A50034" />
        </svg>
      </div>
    ),
    size,
  );
}
