import type { ImageViewModel, VectorImage } from './raw-schema';

/** The URL of the largest rendition of an image. */
export function buildImageUrl(
  image: VectorImage | null | undefined,
): string | null {
  const artifacts = image?.artifacts ?? [];
  if (image?.rootUrl == null || artifacts.length === 0) return null;
  const largest = artifacts.reduce((best, artifact) =>
    artifact.width > best.width ? artifact : best,
  );
  return `${image.rootUrl}${largest.fileIdentifyingUrlPathSegment}`;
}

/** The URL of the largest rendition of the picture in an image view model. */
export function imageViewModelUrl(
  image: ImageViewModel | null | undefined,
): string | null {
  const detail = image?.attributes?.at(0)?.detailData;
  if (detail == null) return null;
  const vectorImage = [
    detail.vectorImage,
    detail.nonEntityCompanyLogo?.vectorImage,
    detail.nonEntityProfilePicture?.vectorImage,
    detail.companyLogo?.vectorImage,
    detail.profilePicture?.vectorImage,
    detail.nonEntityProfessionalEventLogo?.vectorImage,
    detail.professionalEventLogo?.vectorImage,
    detail.nonEntityGroupLogo?.vectorImage,
    detail.groupLogo?.vectorImage,
  ].find((candidate) => candidate != null);
  return buildImageUrl(vectorImage);
}
