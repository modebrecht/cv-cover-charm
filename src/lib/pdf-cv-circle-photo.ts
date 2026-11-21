const circleCv =
  ':is([data-cv-template="terracotta"], [data-cv-template="studio3"])[data-cv-photo-shape="circle"]';
const colorFilters =
  /^(?:none|(?:(?:contrast|saturate|brightness|grayscale|sepia|opacity)\([\d.]+%?\)\s*)+)$/;

function snappedRect(left: number, top: number, width: number, height: number) {
  const x = Math.round(left);
  const y = Math.round(top);
  return { x, y, width: Math.round(left + width) - x, height: Math.round(top + height) - y };
}

/** Match the browser's pixel snapping for the auto-positioned circle in the two CVs. */
export async function snapCvCirclePhotoForPdf(page: HTMLElement, scale: number) {
  if (!page.hasAttribute("data-cv-page") || !page.closest(circleCv)) return;
  const photo = page.querySelector<HTMLElement>("[data-cv-photo]:not([data-cv-photo-free])");
  const image = photo?.querySelector<HTMLImageElement>(":scope > img");
  const view = page.ownerDocument.defaultView;
  if (!photo || !image || !view || !/^data:image\/(?:png|jpeg|webp);/i.test(image.src)) return;
  try {
    await image.decode();
  } catch {
    return;
  }

  const frameStyle = view.getComputedStyle(photo);
  const imageStyle = view.getComputedStyle(image);
  if (
    frameStyle.overflow !== "hidden" ||
    frameStyle.backgroundColor !== "rgba(0, 0, 0, 0)" ||
    frameStyle.transform !== "none" ||
    imageStyle.transform !== "none" ||
    imageStyle.objectFit !== "cover" ||
    imageStyle.objectPosition !== "50% 50%" ||
    !colorFilters.test(imageStyle.filter)
  )
    return;
  const frameBox = photo.getBoundingClientRect();
  const imageBox = image.getBoundingClientRect();
  if (
    !image.naturalWidth ||
    !image.naturalHeight ||
    Math.abs(frameBox.width - frameBox.height) > 0.05 ||
    Math.abs(frameBox.width - parseFloat(frameStyle.width)) > 0.05 ||
    Math.abs(imageBox.width - parseFloat(imageStyle.width)) > 0.05 ||
    Math.abs(imageBox.height - parseFloat(imageStyle.height)) > 0.05
  )
    return;

  const pageBox = page.getBoundingClientRect();
  const x = frameBox.left - pageBox.left;
  const y = frameBox.top - pageBox.top;
  const frame = snappedRect(x, y, frameBox.width, frameBox.height);
  const radiusX = frame.width / 2;
  const radiusY = frame.height / 2;
  const pseudo = Array.from(photo.children).find(
    (child) => child.localName === "html2canvaspseudoelement",
  );
  const border = pseudo ? view.getComputedStyle(pseudo) : view.getComputedStyle(photo, "::after");
  const borderWidth = parseFloat(border.borderTopWidth);
  if (!(borderWidth >= 0 && borderWidth < Math.min(radiusX, radiusY))) return;

  const zoom = Math.max(imageBox.width / image.naturalWidth, imageBox.height / image.naturalHeight);
  const croppedWidth = image.naturalWidth * zoom;
  const croppedHeight = image.naturalHeight * zoom;
  const croppedImage = snappedRect(
    imageBox.left - pageBox.left + (imageBox.width - croppedWidth) / 2,
    imageBox.top - pageBox.top + (imageBox.height - croppedHeight) / 2,
    croppedWidth,
    croppedHeight,
  );
  const canvas = page.ownerDocument.createElement("canvas");
  canvas.width = Math.round(frame.width * scale);
  canvas.height = Math.round(frame.height * scale);
  const ctx = canvas.getContext("2d");
  if (!ctx || !("filter" in ctx)) return;
  ctx.scale(canvas.width / frame.width, canvas.height / frame.height);
  ctx.save();
  ctx.beginPath();
  ctx.ellipse(radiusX, radiusY, radiusX, radiusY, 0, 0, Math.PI * 2);
  ctx.clip();
  ctx.filter = imageStyle.filter;
  ctx.drawImage(
    image,
    croppedImage.x - frame.x,
    croppedImage.y - frame.y,
    croppedImage.width,
    croppedImage.height,
  );
  ctx.restore();
  if (borderWidth > 0) {
    ctx.beginPath();
    ctx.ellipse(radiusX, radiusY, radiusX, radiusY, 0, 0, Math.PI * 2);
    ctx.moveTo(frame.width - borderWidth, radiusY);
    ctx.ellipse(radiusX, radiusY, radiusX - borderWidth, radiusY - borderWidth, 0, 0, Math.PI * 2);
    ctx.fillStyle = border.borderTopColor;
    ctx.fill("evenodd");
  }

  // Keep the original layout box so neighbouring fields retain their positions.
  canvas.style.cssText = `position:absolute;left:${frame.x - x}px;top:${frame.y - y}px;width:${frame.width}px;height:${frame.height}px;pointer-events:none`;
  image.style.visibility = "hidden";
  photo.style.overflow = "visible";
  photo.style.setProperty("--cv-photo-border-width", "0px");
  pseudo?.remove();
  photo.append(canvas);
}
