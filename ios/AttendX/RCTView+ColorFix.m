#import <React/RCTView.h>

// Some legacy interop paths can incorrectly forward a `color` prop to RCTView
// under the New Architecture. RCTView does not implement setColor:, so iOS
// throws NSInvalidArgumentException. This no-op selector prevents hard crashes.
@implementation RCTView (ColorFix)

- (void)setColor:(id)color
{
  (void)color;
}

@end
