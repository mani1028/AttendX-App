#import <React/RCTView.h>

// Under the New Architecture, some legacy interop paths or third-party libraries
// (like react-native-svg or older navigation wrappers) may incorrectly forward
// component-specific props to a standard RCTView. Since RCTView doesn't implement
// these setters, iOS throws an NSInvalidArgumentException.
// These no-op implementations prevent those hard crashes.

@implementation RCTView (ColorFix)

- (void)setColor:(id)color { (void)color; }
- (void)setTitle:(id)title { (void)title; }
- (void)setHide:(id)hide { (void)hide; }
- (void)setPointerEvents:(id)pointerEvents { (void)pointerEvents; }
- (void)setAdjustsFontSizeToFit:(id)adjusts { (void)adjusts; }
- (void)setMinimumFontScale:(id)scale { (void)scale; }
- (void)setNumberOfLines:(id)lines { (void)lines; }
- (void)setSelectionColor:(id)color { (void)color; }
- (void)setLargeTitleFontWeight:(id)fontWeight { (void)fontWeight; }

@end
