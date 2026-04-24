#import <React/RCTView.h>

// Some legacy interop paths can incorrectly forward a `color` prop to RCTView
// under the New Architecture. RCTView does not implement setColor:, so iOS
// throws NSInvalidArgumentException. This no-op selector prevents hard crashes.
@implementation RCTView (ColorFix)

- (void)setColor:(id)color
{
  (void)color;
}

// Some wrappers still map `title` to the backing native view on iOS.
// Ignore it on RCTView to avoid unrecognized selector crashes.
- (void)setTitle:(id)title
{
  (void)title;
}

@end
