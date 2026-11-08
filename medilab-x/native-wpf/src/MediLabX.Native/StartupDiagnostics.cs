using System;
using System.IO;
using System.Text;
using System.Windows;

namespace MediLabX.Native;

internal static class StartupDiagnostics
{
    private static readonly object Gate = new();
    internal static string PathToLog { get; } = GetLogPath();
    internal static string DataDirectory { get; } = System.IO.Path.GetDirectoryName(System.IO.Path.GetDirectoryName(PathToLog)!)!;

    private static string GetLogPath()
    {
        var appData = Environment.GetFolderPath(Environment.SpecialFolder.ApplicationData);
        var preferred = System.IO.Path.Combine(appData, "MediLab", "Standard", "NativeWpf", "logs", "startup.log");
        try { Directory.CreateDirectory(System.IO.Path.GetDirectoryName(preferred)!); return preferred; }
        catch
        {
            var fallback = System.IO.Path.Combine(System.IO.Path.GetTempPath(), "MediLabX-Native", "startup.log");
            try { Directory.CreateDirectory(System.IO.Path.GetDirectoryName(fallback)!); } catch { }
            return fallback;
        }
    }

    internal static void Write(string phase, string? extra = null)
    {
        try
        {
            lock (Gate)
            {
                var message = $"{DateTimeOffset.Now:O} | {phase}" + (extra is null ? "" : $" | {extra}") + Environment.NewLine;
                File.AppendAllText(PathToLog, message, Encoding.UTF8);
            }
        }
        catch { /* Logging must never prevent launch. */ }
    }

    internal static void Fatal(string phase, Exception exception)
    {
        var error = exception.GetBaseException();
        Write("FATAL " + phase, error.GetType().Name + ": " + error.Message);
        try
        {
            MessageBox.Show(
                "MediLab X could not open.\n\n" + error.GetType().Name + ": " + error.Message +
                "\n\nStartup diagnostic log:\n" + PathToLog +
                "\n\nPlease share only the error and log after checking for personal information.",
                "MediLab X — Startup problem", MessageBoxButton.OK, MessageBoxImage.Error);
        }
        catch { }
    }
}