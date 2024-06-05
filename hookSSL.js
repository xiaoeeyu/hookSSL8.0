function LogPrint(log) {
    var theDate = new Date();
    var hour = theDate.getHours();
    var minute = theDate.getMinutes();
    var second = theDate.getSeconds();
    var mSecond = theDate.getMilliseconds();

    hour < 10 ? hour = "0" + hour : hour;
    minute < 10 ? minute = "0" + minute : minute;
    second < 10 ? second = "0" + second : second;
    mSecond < 10 ? mSecond = "00" + mSecond : mSecond < 100 ? mSecond = "0" + mSecond : mSecond;
    var time = hour + ":" + minute + ":" + second + ":" + mSecond;
    var threadid = Process.getCurrentThreadId();
    console.log("[" + time + "]" + "->threadid:" + threadid + "--" + log);

}

function printJavaStack(name) {
    Java.perform(function () {
        var Exception = Java.use("java.lang.Exception");
        var ins = Exception.$new("Exception");
        var straces = ins.getStackTrace();
        if (straces != undefined && straces != null) {
            var strace = straces.toString();
            var replaceStr = strace.replace(/,/g, " \n ");
            LogPrint("=============================" + name + " Stack strat=======================");
            LogPrint(replaceStr);
            LogPrint("=============================" + name + " Stack end======================= \n ");
            Exception.$dispose();
        }
    });
}
function getsocketdetail(fd) {
    var result = "";
    var type = Socket.type(fd);
    if (type != null) {
        result = result + "type:" + type;
        var peer = Socket.peerAddress(fd);
        var local = Socket.localAddress(fd);
        result = result + ",address:" + JSON.stringify(peer) + ",local:" + JSON.stringify(local);
    } else {
        result = "unknown";
    }
    return result;

}

function printNativeStack(context, name) {
    //Debug.
    var array = Thread.backtrace(context, Backtracer.ACCURATE);
    var first = DebugSymbol.fromAddress(array[0]);
    if (first.toString().indexOf('libopenjdk.so!NET_Send') < 0) {
        var trace = Thread.backtrace(context, Backtracer.ACCURATE).map(DebugSymbol.fromAddress).join("\n");
        LogPrint("-----------start:" + name + "--------------");
        LogPrint(trace);
        LogPrint("-----------end:" + name + "--------------");
    }

}
function isprintable(value) {
    if (value >= 32 && value <= 126) {
        return true;
    }
    return false;
}
function hookssl() {
    Java.perform(function () {
        var NativeCryptoClass = Java.use('com.android.org.conscrypt.NativeCrypto');
        NativeCryptoClass.SSL_read.implementation = function (arg0, arg1, arg2, arg3, arg4, arg5, arg6) {
            var size = this.SSL_read(arg0, arg1, arg2, arg3, arg4, arg5, arg6);
            var bytearray = Java.array('byte', arg3);
            var content = '';
            for (var i = 0; i < size; i++) {
                if (isprintable(bytearray[i])) {
                    content = content + String.fromCharCode(bytearray[i]);
                }
            }
            console.log("\n[" + Process.getCurrentThreadId() + "]ssl receive:" + content);
            printJavaStack('NativeCryptoClass.read')
            return size;
        }
        NativeCryptoClass.SSL_write.implementation = function (arg0, arg1, arg2, arg3, arg4, arg5, arg6) {
            var result = this.SSL_write(arg0, arg1, arg2, arg3, arg4, arg5, arg6);
            var bytearray = Java.array('byte', arg3);
            var content = '';
            for (var i = 0; i < arg5; i++) {
                if (isprintable(bytearray[i])) {
                    content = content + String.fromCharCode(bytearray[i]);
                }
            }
            console.log("\n[" + Process.getCurrentThreadId() + "]ssl send:" + content);
            printJavaStack('NativeCryptoClass.SSL_write')
            return result;
        }
    })
}
function enumerate() {
    Java.perform(function () {
        Java.enumerateLoadedClassesSync().forEach(function (classname) {
            if (classname.indexOf("NativeCrypto") >= 0) {
                console.log(classname);
            }
        })
    })
}

function main() {
    //enumerate();
    hookssl();
}

setImmediate(main)
