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

// Navigation appearance props can be forwarded to regular views by mistake.
// Ignore this unsupported setter on RCTView.
- (void)setLargeTitleFontWeight:(id)fontWeight
{
  (void)fontWeight;
}

// Some legacy components pass `hide` as a view prop through interop.
// Ignore it on RCTView to avoid startup crashes.
- (void)setHide:(id)hide
{
  (void)hide;
}

@end
