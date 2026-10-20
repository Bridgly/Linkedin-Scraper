import { z } from 'zod';

/**
 * Shapes LinkedIn reuses across responses. Only the fields this project reads
 * are modelled; Zod drops the rest.
 */

/**
 * An image stored as several renditions. The full URL is `rootUrl` followed by
 * a rendition's `fileIdentifyingUrlPathSegment`.
 */
export const VectorImageSchema = z.object({
  rootUrl: z.string().nullish(),
  artifacts: z
    .array(
      z.object({
        width: z.number(),
        fileIdentifyingUrlPathSegment: z.string(),
      }),
    )
    .nullish(),
});
export type VectorImage = z.infer<typeof VectorImageSchema>;

/** A rendered string. */
export const TextViewModelSchema = z.object({
  text: z.string().nullish(),
});

/** A link target, usually a linkedin.com URL. */
export const NavigationContextSchema = z.object({
  actionTarget: z.string().nullish(),
});

const LogoSchema = z.object({
  vectorImage: VectorImageSchema.nullish(),
});

/**
 * An image as the newer ("dash") responses render it. The picture sits either
 * directly on `detailData` or inside one of the logo / profile-picture wrappers.
 * `systemImage` names a built-in icon instead, e.g. `SYS_ICN_VERIFIED_SMALL`.
 */
export const ImageViewModelSchema = z.object({
  attributes: z
    .array(
      z.object({
        detailData: z
          .object({
            vectorImage: VectorImageSchema.nullish(),
            nonEntityCompanyLogo: LogoSchema.extend({
              '*company': z.string().nullish(),
            }).nullish(),
            nonEntityProfilePicture: LogoSchema.nullish(),
            companyLogo: LogoSchema.nullish(),
            profilePicture: LogoSchema.nullish(),
            nonEntityProfessionalEventLogo: LogoSchema.nullish(),
            professionalEventLogo: LogoSchema.nullish(),
            nonEntityGroupLogo: LogoSchema.nullish(),
            groupLogo: LogoSchema.nullish(),
            systemImage: z.string().nullish(),
          })
          .nullish(),
      }),
    )
    .nullish(),
});
export type ImageViewModel = z.infer<typeof ImageViewModelSchema>;
