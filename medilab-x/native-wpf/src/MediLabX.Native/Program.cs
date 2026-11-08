using System;
using System.Windows;

namespace MediLabX.Native;

internal static class Program
{
    [STAThread]
    public static int Main()
    {
        StartupDiagnostics.Write("Entrypoint reached", "0.2.1");
        try
        {
            var app = new App();
            app.InitializeComponent();
            StartupDiagnostics.Write("Application resources initialized");
            app.Run();
            StartupDiagnostics.Write("Application closed normally");
            return 0;
        }
        catch (Exception ex)
        {
            StartupDiagnostics.Fatal("Application startup failed", ex);
            return 1;
        }
    }
}