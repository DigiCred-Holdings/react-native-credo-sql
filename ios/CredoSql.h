
#ifdef RCT_NEW_ARCH_ENABLED
#import "RNCredoSqlSpec.h"

@interface CredoSql : NSObject <NativeCredoSqlSpec>
#else
#import <React/RCTBridgeModule.h>

@interface CredoSql : NSObject <RCTBridgeModule>
#endif

@end
