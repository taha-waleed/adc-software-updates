using System;
using System.IO;
namespace MediLabX.Desktop;
internal static class Diagnostics
{
 public static readonly string Root=Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.ApplicationData),"MediLab","Standard","OriginalUIHost");
 public static readonly string LogPath=Path.Combine(Root,"logs","startup.log");
 public static void Write(string message)
 {
  try {Directory.CreateDirectory(Path.GetDirectoryName(LogPath)!);File.AppendAllText(LogPath,DateTimeOffset.Now.ToString("O")+" | "+message+Environment.NewLine);}catch{}
 }
}